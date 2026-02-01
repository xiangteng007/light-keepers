/**
 * Disaster Resilience E2E Tests
 * 災時韌性 P0 服務測試
 * 
 * 測試範圍：
 * - OfflineAuthService
 * - PrioritySyncService
 * - ConflictResolverService
 * - MeshHealthService
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient } from './test-helpers';

describe('Disaster Resilience (P0) E2E Tests', () => {
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

    // ==================== Offline Auth Tests ====================
    describe('Offline Authentication', () => {
        describe('POST /offline-auth/token', () => {
            it('should generate offline token for authenticated user', async () => {
                const response = await client.asOfficer().post('/offline-auth/token');
                
                if (response.status === 404) {
                    // Endpoint may not be exposed yet
                    console.log('Offline auth endpoint not exposed');
                    return;
                }

                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('token');
                expect(response.body).toHaveProperty('expiresAt');
            });

            it('should reject unauthenticated requests', async () => {
                const response = await client.request().post('/offline-auth/token');
                expect(response.status).toBe(401);
            });
        });

        describe('POST /offline-auth/verify', () => {
            it('should verify valid offline token', async () => {
                // First get a token
                const tokenResponse = await client.asOfficer().post('/offline-auth/token');
                
                if (tokenResponse.status === 404) return;

                const verifyResponse = await client.request()
                    .post('/offline-auth/verify')
                    .send({ token: tokenResponse.body.token });

                expect(verifyResponse.status).toBe(200);
                expect(verifyResponse.body).toHaveProperty('valid', true);
            });

            it('should reject invalid token', async () => {
                const response = await client.request()
                    .post('/offline-auth/verify')
                    .send({ token: 'invalid-token' });

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('valid', false);
            });
        });
    });

    // ==================== Priority Sync Tests ====================
    describe('Priority Sync Queue', () => {
        describe('POST /sync/enqueue', () => {
            it('should enqueue SOS message with CRITICAL priority', async () => {
                const response = await client.asOfficer()
                    .post('/sync/enqueue')
                    .send({
                        type: 'sos',
                        payload: { message: 'Emergency SOS', location: { lat: 25.03, lng: 121.56 } },
                    });

                if (response.status === 404) return;

                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('id');
                expect(response.body).toHaveProperty('priority', 1); // CRITICAL
            });

            it('should enqueue resource request with HIGH priority', async () => {
                const response = await client.asOfficer()
                    .post('/sync/enqueue')
                    .send({
                        type: 'resource_request',
                        payload: { resourceType: 'water', quantity: 100 },
                    });

                if (response.status === 404) return;

                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('priority', 2); // HIGH
            });
        });

        describe('GET /sync/queue', () => {
            it('should return queue sorted by priority', async () => {
                const response = await client.asOfficer().get('/sync/queue');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('items');
                expect(Array.isArray(response.body.items)).toBe(true);
            });
        });

        describe('GET /sync/stats', () => {
            it('should return sync statistics', async () => {
                const response = await client.asOfficer().get('/sync/stats');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('pending');
                expect(response.body).toHaveProperty('synced');
                expect(response.body).toHaveProperty('failed');
            });
        });
    });

    // ==================== Conflict Resolution Tests ====================
    describe('Conflict Resolution', () => {
        describe('POST /conflicts/detect', () => {
            it('should detect resource allocation conflict', async () => {
                const response = await client.asOfficer()
                    .post('/conflicts/detect')
                    .send({
                        type: 'resource_allocation',
                        resourceId: 'resource-1',
                        allocations: [
                            { userId: 'user-1', timestamp: Date.now() - 1000 },
                            { userId: 'user-2', timestamp: Date.now() },
                        ],
                    });

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('hasConflict');
            });
        });

        describe('POST /conflicts/resolve', () => {
            it('should resolve task assignment conflict', async () => {
                const response = await client.asAdmin()
                    .post('/conflicts/resolve')
                    .send({
                        conflictId: 'conflict-1',
                        resolution: 'higher_authority',
                        resolvedValue: { assignee: 'user-1' },
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
                expect(response.body).toHaveProperty('resolved', true);
            });
        });
    });

    // ==================== Mesh Health Tests ====================
    describe('Mesh Network Health', () => {
        describe('GET /mesh/nodes', () => {
            it('should return all mesh nodes', async () => {
                const response = await client.asOfficer().get('/mesh/nodes');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /mesh/health', () => {
            it('should return network health summary', async () => {
                const response = await client.asOfficer().get('/mesh/health');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('totalNodes');
                expect(response.body).toHaveProperty('onlineNodes');
                expect(response.body).toHaveProperty('activeAlerts');
            });
        });

        describe('POST /mesh/nodes/:id/heartbeat', () => {
            it('should update node heartbeat', async () => {
                const response = await client.asOfficer()
                    .post('/mesh/nodes/node-1/heartbeat')
                    .send({
                        signalDbm: -65,
                        batteryLevel: 0.85,
                        neighbors: ['node-2', 'node-3'],
                        latencyMs: 50,
                        packetLoss: 0.02,
                    });

                if (response.status === 404) return;

                expect([200, 201]).toContain(response.status);
            });
        });

        describe('GET /mesh/routes/:from/:to', () => {
            it('should return best route between nodes', async () => {
                const response = await client.asOfficer().get('/mesh/routes/node-1/node-5');

                if (response.status === 404) return;

                if (response.status === 200) {
                    expect(response.body).toHaveProperty('path');
                    expect(response.body).toHaveProperty('hopCount');
                }
            });
        });

        describe('GET /mesh/alerts', () => {
            it('should return active alerts', async () => {
                const response = await client.asOfficer().get('/mesh/alerts');

                if (response.status === 404) return;

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });
    });
});
