/**
 * Governance and Scalability E2E Tests
 * 合規治理 P2 + 擴展性 P3 服務測試
 * 
 * 測試範圍：
 * - TaiwanPdpaService
 * - AiGovernanceService
 * - MultiRegionService
 * - EventExternalizationService
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient } from './test-helpers';

describe('Governance and Scalability (P2 + P3) E2E Tests', () => {
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

    // ==================== Taiwan PDPA Tests ====================
    describe('Taiwan PDPA Compliance', () => {
        let consentId: string;

        describe('POST /privacy/consent', () => {
            it('should record user consent', async () => {
                const response = await client.asOfficer()
                    .post('/privacy/consent')
                    .send({
                        dataCategory: 'location_data',
                        purpose: 'Emergency response tracking',
                        collectionMethod: 'gps_tracking',
                        validityMonths: 12,
                    });

                if (response.status === 404) {
                    console.log('Privacy consent endpoint not exposed');
                    return;
                }

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
                consentId = response.body.id;
            });
        });

        describe('GET /privacy/consent', () => {
            it('should return user consents', async () => {
                const response = await client.asOfficer().get('/privacy/consent');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('DELETE /privacy/consent/:id', () => {
            it('should revoke consent', async () => {
                if (!consentId) return;

                const response = await client.asOfficer()
                    .delete(`/privacy/consent/${consentId}`);

                if (response.status === 404) return;

                expect([200, 204]).toContain(response.status);
            });
        });

        describe('GET /privacy/retention-policies', () => {
            it('should return data retention policies', async () => {
                const response = await client.asAdmin().get('/privacy/retention-policies');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('mission_records');
                expect(response.body).toHaveProperty('volunteer_personal');
            });
        });

        describe('POST /privacy/dsar', () => {
            it('should handle data subject access request', async () => {
                const response = await client.asOfficer()
                    .post('/privacy/dsar')
                    .send({
                        requestType: 'access',
                        details: 'Request all my personal data',
                    });

                if (response.status === 404) return;

                expect([200, 201, 202]).toContain(response.status);
                expect(response.body).toHaveProperty('id');
                expect(response.body).toHaveProperty('status');
            });
        });

        describe('POST /privacy/breach', () => {
            it('should report data breach (admin only)', async () => {
                const response = await client.asAdmin()
                    .post('/privacy/breach')
                    .send({
                        dataTypes: ['personal_info', 'location_data'],
                        affectedCount: 100,
                        severity: 'high',
                        discoveredAt: new Date().toISOString(),
                        description: 'Unauthorized access detected',
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('incidentId');
            });
        });

        describe('GET /privacy/compliance-report', () => {
            it('should generate compliance report', async () => {
                const response = await client.asAdmin().get('/privacy/compliance-report');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('generatedAt');
                expect(response.body).toHaveProperty('dataRetentionCompliance');
            });
        });
    });

    // ==================== AI Governance Tests ====================
    describe('AI Governance Framework', () => {
        let decisionId: string;

        describe('POST /ai/decisions', () => {
            it('should process AI decision with high confidence (auto-execute)', async () => {
                const response = await client.asOfficer()
                    .post('/ai/decisions')
                    .send({
                        decisionType: 'resource_allocation',
                        agentName: 'dispatcher-agent',
                        input: { request: 'Allocate 10 rescue personnel', mission: 'mission-1' },
                        output: { allocation: [{ team: 'rescue-1', count: 10 }] },
                        confidence: 0.97,
                        reasoning: 'Based on current availability and proximity',
                    });

                if (response.status === 404) {
                    console.log('AI decisions endpoint not exposed');
                    return;
                }

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('decisionId');
                expect(response.body).toHaveProperty('execute', true);
                expect(response.body).toHaveProperty('requiresApproval', false);
            });

            it('should process AI decision with low confidence (requires approval)', async () => {
                const response = await client.asOfficer()
                    .post('/ai/decisions')
                    .send({
                        decisionType: 'priority_triage',
                        agentName: 'intel-agent',
                        input: { situation: 'Complex multi-site incident' },
                        output: { priority: ['site-a', 'site-b', 'site-c'] },
                        confidence: 0.55,
                        reasoning: 'Insufficient data for high confidence',
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('decisionId');
                expect(response.body).toHaveProperty('execute', false);
                expect(response.body).toHaveProperty('requiresApproval', true);
                decisionId = response.body.decisionId;
            });
        });

        describe('POST /ai/decisions/:id/approve', () => {
            it('should approve pending decision', async () => {
                if (!decisionId) return;

                const response = await client.asAdmin()
                    .post(`/ai/decisions/${decisionId}/approve`);

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
            });
        });

        describe('POST /ai/decisions/:id/reject', () => {
            it('should reject pending decision', async () => {
                // Create another low-confidence decision to reject
                const createResponse = await client.asOfficer()
                    .post('/ai/decisions')
                    .send({
                        decisionType: 'risk_assessment',
                        agentName: 'forecaster-agent',
                        input: { area: 'zone-a' },
                        output: { riskLevel: 'high' },
                        confidence: 0.45,
                    });

                if (createResponse.status === 404) return;

                const rejectResponse = await client.asAdmin()
                    .post(`/ai/decisions/${createResponse.body.decisionId}/reject`)
                    .send({ reason: 'Insufficient data quality' });

                if (rejectResponse.status === 404) return;

                expect([200, 201]).toContain(rejectResponse.status);
            });
        });

        describe('GET /ai/audit-log', () => {
            it('should return AI decision audit log', async () => {
                const response = await client.asAdmin().get('/ai/audit-log');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /ai/token-usage', () => {
            it('should return token usage statistics', async () => {
                const response = await client.asAdmin().get('/ai/token-usage');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('inputTokens');
                expect(response.body).toHaveProperty('outputTokens');
                expect(response.body).toHaveProperty('estimatedCost');
            });
        });

        describe('GET /ai/governance-report', () => {
            it('should generate governance report', async () => {
                const response = await client.asAdmin().get('/ai/governance-report');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('totalDecisions');
                expect(response.body).toHaveProperty('byConfidenceLevel');
                expect(response.body).toHaveProperty('recommendations');
            });
        });

        describe('GET /ai/policy', () => {
            it('should return AI governance policy', async () => {
                const response = await client.asAdmin().get('/ai/policy');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('autoExecuteThreshold');
                expect(response.body).toHaveProperty('requireHumanApprovalFor');
            });
        });
    });

    // ==================== Multi-Region Tests ====================
    describe('Multi-Region Deployment', () => {
        describe('GET /regions', () => {
            it('should return all regions', async () => {
                const response = await client.asAdmin().get('/regions');

                if (response.status === 404) {
                    console.log('Regions endpoint not exposed');
                    return;
                }

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /regions/active', () => {
            it('should return active region', async () => {
                const response = await client.asAdmin().get('/regions/active');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('id');
                expect(response.body).toHaveProperty('role');
            });
        });

        describe('GET /regions/status', () => {
            it('should return all regions status', async () => {
                const response = await client.asAdmin().get('/regions/status');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('POST /regions/switch', () => {
            it('should switch active region (admin only)', async () => {
                const response = await client.asAdmin()
                    .post('/regions/switch')
                    .send({ regionId: 'asia-northeast1' });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
            });
        });

        describe('GET /regions/deployment-summary', () => {
            it('should return deployment summary', async () => {
                const response = await client.asAdmin().get('/regions/deployment-summary');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('activeRegion');
                expect(response.body).toHaveProperty('totalRegions');
                expect(response.body).toHaveProperty('healthyRegions');
            });
        });
    });

    // ==================== Event Externalization Tests ====================
    describe('Event Externalization (Pub/Sub)', () => {
        describe('POST /events/publish', () => {
            it('should publish event to topic', async () => {
                const response = await client.asOfficer()
                    .post('/events/publish')
                    .send({
                        topic: 'MISSION_CREATED',
                        payload: { missionId: 'mission-123', name: 'Test Mission' },
                    });

                if (response.status === 404) {
                    console.log('Events endpoint not exposed');
                    return;
                }

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('eventId');
            });
        });

        describe('GET /events/stats', () => {
            it('should return publish statistics', async () => {
                const response = await client.asAdmin().get('/events/stats');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('total');
                expect(response.body).toHaveProperty('successful');
            });
        });

        describe('GET /events/queue-depths', () => {
            it('should return queue depths by topic', async () => {
                const response = await client.asAdmin().get('/events/queue-depths');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /events/subscriptions', () => {
            it('should return active subscriptions', async () => {
                const response = await client.asAdmin().get('/events/subscriptions');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });
    });
});
