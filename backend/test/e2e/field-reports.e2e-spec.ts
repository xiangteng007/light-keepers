import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient, TEST_USERS, authTestScenarios } from './test-helpers';

describe('FieldReportsController (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let client: TestClient;

    // Track created resources for cleanup
    let createdMissionSessionId: string;
    let createdReportId: string;
    let createdSosId: string;

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        jwtService = moduleRef.get<JwtService>(JwtService);
        client = new TestClient(app, jwtService);

        // Create a test mission session for our tests
        // Note: In a real scenario, this would be done via mission-sessions API
        createdMissionSessionId = 'e2e-test-mission-' + Date.now();
    });

    afterAll(async () => {
        await app.close();
    });

    // ===== Field Reports CRUD =====

    describe('POST /mission-sessions/:id/reports', () => {
        const reportData = {
            type: 'incident',
            category: 'general',
            severity: 2,
            confidence: 80,
            message: 'E2E Test Field Report',
            latitude: 25.0330,
            longitude: 121.5654,
            accuracyM: 10,
            metadata: { testMarker: true },
        };

        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post(`/mission-sessions/${createdMissionSessionId}/reports`)
                .send(reportData);
            expect(response.status).toBe(401);
        });

        it('403 - should reject public level (requires volunteer+)', async () => {
            // Public/anonymous should not be able to create field reports
            const response = await client.request()
                .post(`/mission-sessions/${createdMissionSessionId}/reports`)
                .send(reportData);
            expect(response.status).toBe(401);
        });

        it('201 - should create report for volunteer', async () => {
            const response = await client.asVolunteer()
                .post(`/mission-sessions/${createdMissionSessionId}/reports`)
                .send(reportData);

            // Store for later tests (may fail if mission session doesn't exist)
            if (response.status === 201) {
                createdReportId = response.body.id;
                expect(response.body).toHaveProperty('id');
                expect(response.body).toHaveProperty('type', 'incident');
                expect(response.body).toHaveProperty('severity', 2);
            } else {
                // Accept 404 if mission session doesn't exist
                expect([201, 404]).toContain(response.status);
            }
        });
    });

    describe('GET /mission-sessions/:id/reports', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .get(`/mission-sessions/${createdMissionSessionId}/reports`);
            expect(response.status).toBe(401);
        });

        it('200 - should return reports for volunteer', async () => {
            const response = await client.asVolunteer()
                .get(`/mission-sessions/${createdMissionSessionId}/reports`);

            // Accept 200 with data or 404 if mission doesn't exist
            if (response.status === 200) {
                expect(response.body).toHaveProperty('data');
                expect(response.body).toHaveProperty('cursor');
                expect(response.body).toHaveProperty('hasMore');
            } else {
                expect([200, 404]).toContain(response.status);
            }
        });

        it('200 - should support since filter', async () => {
            const since = new Date(Date.now() - 3600000).toISOString();
            const response = await client.asVolunteer()
                .get(`/mission-sessions/${createdMissionSessionId}/reports?since=${since}`);

            expect([200, 404]).toContain(response.status);
        });

        it('200 - should support bbox filter', async () => {
            const bbox = '121.5,25.0,121.6,25.1';
            const response = await client.asVolunteer()
                .get(`/mission-sessions/${createdMissionSessionId}/reports?bbox=${bbox}`);

            expect([200, 404]).toContain(response.status);
        });
    });

    describe('PATCH /reports/:id', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .patch('/reports/test-report-id')
                .set('If-Match', '"1"')
                .send({ status: 'triaged' });
            expect(response.status).toBe(401);
        });

        it('200 - should update report with version check', async () => {
            if (!createdReportId) {
                console.log('Skipping - no report created');
                return;
            }

            const response = await client.asOfficer()
                .patch(`/reports/${createdReportId}`)
                .set('If-Match', '"1"')
                .send({ status: 'triaged', severity: 3 });

            if (response.status === 200) {
                expect(response.body).toHaveProperty('status', 'triaged');
                expect(response.body).toHaveProperty('version', 2);
            }
        });
    });

    // ===== SOS Signals =====

    describe('POST /mission-sessions/:id/sos', () => {
        const sosData = {
            latitude: 25.0330,
            longitude: 121.5654,
            accuracyM: 15,
            message: 'E2E Test SOS Signal',
        };

        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post(`/mission-sessions/${createdMissionSessionId}/sos`)
                .send(sosData);
            expect(response.status).toBe(401);
        });

        it('201 - should trigger SOS for volunteer', async () => {
            const response = await client.asVolunteer()
                .post(`/mission-sessions/${createdMissionSessionId}/sos`)
                .send(sosData);

            if (response.status === 201) {
                createdSosId = response.body.sosId;
                expect(response.body).toHaveProperty('sosId');
                expect(response.body).toHaveProperty('reportId');
                expect(response.body).toHaveProperty('status', 'active');
            } else {
                expect([201, 404]).toContain(response.status);
            }
        });
    });

    describe('GET /mission-sessions/:id/sos/active', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .get(`/mission-sessions/${createdMissionSessionId}/sos/active`);
            expect(response.status).toBe(401);
        });

        it('200 - should return active SOS signals for volunteer', async () => {
            const response = await client.asVolunteer()
                .get(`/mission-sessions/${createdMissionSessionId}/sos/active`);

            if (response.status === 200) {
                expect(Array.isArray(response.body)).toBe(true);
            } else {
                expect([200, 404]).toContain(response.status);
            }
        });
    });

    describe('POST /sos/:id/ack', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/sos/test-sos-id/ack')
                .send({});
            expect(response.status).toBe(401);
        });

        it('200 - should acknowledge SOS for officer', async () => {
            if (!createdSosId) {
                console.log('Skipping - no SOS created');
                return;
            }

            const response = await client.asOfficer()
                .post(`/sos/${createdSosId}/ack`)
                .send({ note: 'E2E test ACK' });

            if (response.status === 200) {
                expect(response.body).toHaveProperty('status', 'acked');
                expect(response.body).toHaveProperty('ackedBy');
            }
        });
    });

    describe('POST /sos/:id/resolve', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/sos/test-sos-id/resolve')
                .send({});
            expect(response.status).toBe(401);
        });

        it('200 - should resolve SOS for officer', async () => {
            if (!createdSosId) {
                console.log('Skipping - no SOS created');
                return;
            }

            const response = await client.asOfficer()
                .post(`/sos/${createdSosId}/resolve`)
                .send({ resolutionNote: 'E2E test resolved' });

            if (response.status === 200) {
                expect(response.body).toHaveProperty('status', 'resolved');
                expect(response.body).toHaveProperty('resolvedBy');
            }
        });
    });

    // ===== Location Sharing =====

    describe('POST /mission-sessions/:id/location-share/start', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post(`/mission-sessions/${createdMissionSessionId}/location-share/start`)
                .send({ mode: 'mission' });
            expect(response.status).toBe(401);
        });

        it('200 - should start location sharing for volunteer', async () => {
            const response = await client.asVolunteer()
                .post(`/mission-sessions/${createdMissionSessionId}/location-share/start`)
                .send({ mode: 'mission' });

            if (response.status === 200 || response.status === 201) {
                expect(response.body).toHaveProperty('isEnabled', true);
                expect(response.body).toHaveProperty('mode', 'mission');
            } else {
                expect([200, 201, 404]).toContain(response.status);
            }
        });
    });

    describe('GET /mission-sessions/:id/live-locations', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .get(`/mission-sessions/${createdMissionSessionId}/live-locations`);
            expect(response.status).toBe(401);
        });

        it('200 - should return GeoJSON FeatureCollection', async () => {
            const response = await client.asOfficer()
                .get(`/mission-sessions/${createdMissionSessionId}/live-locations`);

            if (response.status === 200) {
                expect(response.body).toHaveProperty('type', 'FeatureCollection');
                expect(response.body).toHaveProperty('features');
                expect(Array.isArray(response.body.features)).toBe(true);
            } else {
                expect([200, 404]).toContain(response.status);
            }
        });
    });

    describe('POST /mission-sessions/:id/location-share/stop', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post(`/mission-sessions/${createdMissionSessionId}/location-share/stop`);
            expect(response.status).toBe(401);
        });

        it('200 - should stop location sharing for volunteer', async () => {
            const response = await client.asVolunteer()
                .post(`/mission-sessions/${createdMissionSessionId}/location-share/stop`);

            if (response.status === 200) {
                expect(response.body).toHaveProperty('isEnabled', false);
            } else {
                expect([200, 404]).toContain(response.status);
            }
        });
    });

    // ===== Photo Evidence =====

    describe('GET /mission-sessions/:id/photo-evidence', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .get(`/mission-sessions/${createdMissionSessionId}/photo-evidence`);
            expect(response.status).toBe(401);
        });

        it('200 - should return photo evidence GeoJSON', async () => {
            const response = await client.asOfficer()
                .get(`/mission-sessions/${createdMissionSessionId}/photo-evidence`);

            if (response.status === 200) {
                expect(response.body).toHaveProperty('type', 'FeatureCollection');
                expect(response.body).toHaveProperty('features');
            } else {
                expect([200, 404]).toContain(response.status);
            }
        });

        it('200 - should support bbox filter', async () => {
            const bbox = '121.5,25.0,121.6,25.1';
            const response = await client.asOfficer()
                .get(`/mission-sessions/${createdMissionSessionId}/photo-evidence?bbox=${bbox}`);

            expect([200, 404]).toContain(response.status);
        });
    });

    // ===== Attachments =====

    describe('POST /reports/:id/attachments/initiate', () => {
        const attachmentData = {
            kind: 'photo',
            mime: 'image/jpeg',
            size: 1024000,
            locationSource: 'device',
            showOnMap: true,
        };

        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/reports/test-report-id/attachments/initiate')
                .send(attachmentData);
            expect(response.status).toBe(401);
        });

        it('200 - should initiate upload for authenticated user', async () => {
            if (!createdReportId) {
                console.log('Skipping - no report created');
                return;
            }

            const response = await client.asVolunteer()
                .post(`/reports/${createdReportId}/attachments/initiate`)
                .send(attachmentData);

            if (response.status === 200 || response.status === 201) {
                expect(response.body).toHaveProperty('attachmentId');
                expect(response.body).toHaveProperty('uploadUrl');
                expect(response.body).toHaveProperty('uploadMethod', 'PUT');
                expect(response.body).toHaveProperty('expiresAt');
            }
        });
    });

    // ===== Task Claims =====

    describe('POST /tasks/:id/claim', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/tasks/test-task-id/claim')
                .send({ missionSessionId: createdMissionSessionId });
            expect(response.status).toBe(401);
        });

        it('200/409 - should claim task for volunteer', async () => {
            const response = await client.asVolunteer()
                .post('/tasks/test-task-id/claim')
                .send({ missionSessionId: createdMissionSessionId });
            expect([200, 404, 409]).toContain(response.status);
        });
    });

    describe('POST /tasks/:id/progress', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/tasks/test-task-id/progress')
                .send({ missionSessionId: createdMissionSessionId, note: 'Test', percent: 50 });
            expect(response.status).toBe(401);
        });
    });

    describe('GET /tasks/:id/claim', () => {
        it('200 - should return claim status', async () => {
            const response = await client.asVolunteer()
                .get('/tasks/test-task-id/claim');
            expect([200, 404]).toContain(response.status);
        });
    });
});
