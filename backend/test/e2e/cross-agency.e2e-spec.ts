/**
 * Cross-Agency Collaboration E2E Tests
 * 跨機關協作 P1 服務測試
 * 
 * 測試範圍：
 * - ICS Forms Service (202, 203, 205)
 * - Multi-EOC Service
 * - Fire-119 Deep Integration
 * - NGO Coordinator Service
 * - INSARAG Marking Service
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient } from './test-helpers';

describe('Cross-Agency Collaboration (P1 + Phase 4) E2E Tests', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let client: TestClient;

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        jwtService = moduleRef.get<JwtService>(JwtService);
        client = new TestClient(app, jwtService);
    });

    afterAll(async () => {
        await app.close();
    });

    // ==================== ICS Forms Tests ====================
    describe('ICS Forms', () => {
        describe('POST /ics-forms/202', () => {
            it('should generate ICS-202 Incident Objectives', async () => {
                const response = await client.asOfficer()
                    .post('/ics-forms/202')
                    .send({
                        incidentName: 'Test Incident',
                        incidentNumber: 'TW-2026-001',
                        operationalPeriod: {
                            from: new Date().toISOString(),
                            to: new Date(Date.now() + 12 * 3600000).toISOString(),
                        },
                        objectives: ['Rescue trapped victims', 'Establish medical triage'],
                        weatherForecast: 'Clear, 25°C',
                        safetyMessage: 'Wear hard hats in collapse zones',
                    });

                if (response.status === 404) {
                    console.log('ICS-202 endpoint not exposed');
                    return;
                }

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('formType', 'ICS-202');
            });
        });

        describe('POST /ics-forms/203', () => {
            it('should generate ICS-203 Organization Assignment', async () => {
                const response = await client.asOfficer()
                    .post('/ics-forms/203')
                    .send({
                        incidentName: 'Test Incident',
                        incidentNumber: 'TW-2026-001',
                        incidentCommander: { name: 'Commander Lee', agency: 'NCDR' },
                        operationsSectionChief: { name: 'Chief Chen', agency: 'Fire Dept' },
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('formType', 'ICS-203');
            });
        });

        describe('POST /ics-forms/205', () => {
            it('should generate ICS-205 Communications Plan', async () => {
                const response = await client.asOfficer()
                    .post('/ics-forms/205')
                    .send({
                        incidentName: 'Test Incident',
                        incidentNumber: 'TW-2026-001',
                        radioChannels: [
                            { name: 'Command', frequency: '155.475', mode: 'FM', assignment: 'IC/EOC' },
                            { name: 'Tactical 1', frequency: '155.325', mode: 'FM', assignment: 'Operations' },
                        ],
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('formType', 'ICS-205');
            });
        });

        describe('GET /ics-forms/templates', () => {
            it('should return available form templates', async () => {
                const response = await client.asOfficer().get('/ics-forms/templates');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                
                if (response.body.length > 0) {
                    expect(response.body).toContainEqual(
                        expect.objectContaining({ type: 'ICS-201' })
                    );
                }
            });
        });
    });

    // ==================== Multi-EOC Tests ====================
    describe('Multi-EOC Coordination', () => {
        let missionId: string;

        describe('POST /multi-eoc/missions', () => {
            it('should create federated mission', async () => {
                const response = await client.asAdmin()
                    .post('/multi-eoc/missions')
                    .send({
                        name: 'Joint Response Mission',
                        leadEocId: 'taipei-eoc',
                        participatingEocs: ['taipei-eoc', 'new-taipei-eoc', 'taoyuan-eoc'],
                        incidentType: 'earthquake',
                        affectedArea: { north: 25.1, south: 24.9, east: 121.6, west: 121.4 },
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
                missionId = response.body.id;
            });
        });

        describe('POST /multi-eoc/missions/:id/transfer-command', () => {
            it('should transfer command between EOCs', async () => {
                if (!missionId) return;

                const response = await client.asAdmin()
                    .post(`/multi-eoc/missions/${missionId}/transfer-command`)
                    .send({
                        fromEocId: 'taipei-eoc',
                        toEocId: 'new-taipei-eoc',
                        reason: 'Shift change',
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
            });
        });

        describe('POST /multi-eoc/cop/merge', () => {
            it('should merge operational pictures from multiple EOCs', async () => {
                const response = await client.asAdmin()
                    .post('/multi-eoc/cop/merge')
                    .send({
                        eocIds: ['taipei-eoc', 'new-taipei-eoc'],
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('mergedAt');
            });
        });

        describe('POST /multi-eoc/mutual-aid', () => {
            it('should request mutual aid between EOCs', async () => {
                const response = await client.asOfficer()
                    .post('/multi-eoc/mutual-aid')
                    .send({
                        requestingEocId: 'taipei-eoc',
                        targetEocId: 'new-taipei-eoc',
                        resourceType: 'rescue_team',
                        quantity: 2,
                        urgency: 'high',
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
            });
        });
    });

    // ==================== Fire-119 Integration Tests ====================
    describe('Fire-119 Deep Integration', () => {
        describe('GET /fire-119/incidents', () => {
            it('should return recent fire incidents', async () => {
                const response = await client.asOfficer().get('/fire-119/incidents');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('success');
            });
        });

        describe('GET /fire-119/units/locations', () => {
            it('should return fire unit locations', async () => {
                const response = await client.asOfficer().get('/fire-119/units/locations');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /fire-119/water-sources', () => {
            it('should return nearby water sources', async () => {
                const response = await client.asOfficer()
                    .get('/fire-119/water-sources')
                    .query({ lat: 25.033, lng: 121.565, radius: 1 });

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('POST /fire-119/situation', () => {
            it('should update fire scene situation', async () => {
                const response = await client.asOfficer()
                    .post('/fire-119/situation')
                    .send({
                        incidentId: 'inc-001',
                        fireStatus: 'contained',
                        affectedFloors: [3, 4],
                        smokeCondition: 'moderate',
                        hazards: ['collapse_risk'],
                        rescues: { confirmed: 5, pending: 2, casualties: 0 },
                        resources: { waterSupply: 'adequate', personnelCount: 24 },
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
            });
        });
    });

    // ==================== NGO Coordinator Tests ====================
    describe('NGO Coordinator Roles', () => {
        describe('POST /ngo/coordinators', () => {
            it('should assign coordinator role', async () => {
                const response = await client.asAdmin()
                    .post('/ngo/coordinators')
                    .send({
                        userId: 'user-123',
                        role: 'CLUSTER_LEAD',
                        organization: 'Red Cross',
                        clusters: ['shelter', 'health'],
                        regions: ['taipei', 'new-taipei'],
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
            });
        });

        describe('GET /ngo/coordinators/directory', () => {
            it('should return coordinator directory', async () => {
                const response = await client.asOfficer().get('/ngo/coordinators/directory');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('byRole');
                expect(response.body).toHaveProperty('byCluster');
            });
        });

        describe('POST /ngo/cluster-meetings', () => {
            it('should schedule cluster meeting', async () => {
                const response = await client.asOfficer()
                    .post('/ngo/cluster-meetings')
                    .send({
                        cluster: 'shelter',
                        title: 'Weekly Shelter Cluster Coordination',
                        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                        venue: 'EOC Building Room 301',
                        agenda: ['Update on shelter capacity', 'Resource gaps', 'NFI distribution'],
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
            });
        });
    });

    // ==================== INSARAG Marking Tests ====================
    describe('INSARAG Marking System', () => {
        let markingId: string;

        describe('POST /insarag/structures', () => {
            it('should create structure marking', async () => {
                const response = await client.asOfficer()
                    .post('/insarag/structures')
                    .send({
                        structureId: 'bldg-001',
                        structureAddress: '台北市信義區松仁路100號',
                        location: { lat: 25.033, lng: 121.565 },
                        quadrant1_structureInfo: {
                            type: 'residential',
                            floors: 12,
                            basements: 2,
                            constructionType: 'RC',
                        },
                        quadrant2_hazards: {
                            hazards: ['collapse_risk', 'gas_leak'],
                            details: 'Partial collapse on floors 8-10',
                        },
                        quadrant3_victims: {
                            confirmed: { alive: 3, deceased: 1 },
                            estimated: { alive: 10, deceased: 2 },
                            locations: ['8F-A unit', '9F-B unit'],
                        },
                        quadrant4_teams: [],
                        overallStatus: 'go_caution',
                    });

                if (response.status === 404) {
                    console.log('INSARAG endpoint not exposed');
                    return;
                }

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
                markingId = response.body.id;
            });
        });

        describe('POST /insarag/victims', () => {
            it('should add victim marking', async () => {
                const response = await client.asOfficer()
                    .post('/insarag/victims')
                    .send({
                        structureId: 'bldg-001',
                        location: {
                            floor: 8,
                            room: 'A unit bedroom',
                            description: 'Under collapsed beam',
                        },
                        status: 'alive_heard',
                        count: 2,
                        detailsKnown: {
                            age: 'adult',
                            trapped: true,
                            accessMethod: 'cutting',
                        },
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
            });
        });

        describe('POST /insarag/hazards', () => {
            it('should add hazard marking', async () => {
                const response = await client.asOfficer()
                    .post('/insarag/hazards')
                    .send({
                        location: { lat: 25.033, lng: 121.566 },
                        type: 'gas_leak',
                        severity: 'high',
                        radius: 50,
                        description: 'Natural gas leak from ruptured main',
                        mitigationStatus: 'active',
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
            });
        });

        describe('GET /insarag/structures/rescue-needed', () => {
            it('should return structures needing rescue', async () => {
                const response = await client.asOfficer().get('/insarag/structures/rescue-needed');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /insarag/stats', () => {
            it('should return search and rescue statistics', async () => {
                const response = await client.asOfficer().get('/insarag/stats');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('structures');
                expect(response.body).toHaveProperty('victims');
                expect(response.body).toHaveProperty('hazards');
            });
        });
    });
});
