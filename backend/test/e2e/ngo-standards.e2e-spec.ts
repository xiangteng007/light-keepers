import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * E2E Tests for P0 International NGO Standards Modules
 * 
 * Tests:
 * - humanitarian-standards: HXL, IATI, 3W, Sphere
 * - staff-security: Incidents, Check-in, Evacuation
 */
describe('P0 NGO Standards (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Get auth token for protected endpoints
        const loginRes = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: 'admin@lightkeepers.org', password: 'password' });
        authToken = loginRes.body.access_token || 'mock-token';
    });

    afterAll(async () => {
        await app.close();
    });

    // ==========================================
    // Humanitarian Standards Module Tests
    // ==========================================
    describe('HumanitarianStandardsModule', () => {
        describe('GET /api/v1/humanitarian-standards/hxl/tags', () => {
            it('should return HXL tag reference', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/humanitarian-standards/hxl/tags')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body).toHaveProperty('country');
                expect(res.body).toHaveProperty('affected');
                expect(res.body.country).toContain('#country');
            });
        });

        describe('POST /api/v1/humanitarian-standards/hxl/export/reports', () => {
            it('should export reports in HXL CSV format', async () => {
                const mockReports = [
                    {
                        id: 'report-001',
                        createdAt: new Date().toISOString(),
                        location: { address: 'Taipei, Taiwan', latitude: 25.0330, longitude: 121.5654 },
                        affectedCount: 150,
                        status: 'active',
                    },
                ];

                const res = await request(app.getHttpServer())
                    .post('/api/v1/humanitarian-standards/hxl/export/reports')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ reports: mockReports, options: { format: 'csv', includeHeaders: true } })
                    .expect(201);

                expect(res.body).toHaveProperty('data');
                expect(res.body.format).toBe('csv');
                expect(res.body.data).toContain('#country');
            });
        });

        describe('GET /api/v1/humanitarian-standards/sphere/standards', () => {
            it('should return Sphere standards reference', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/humanitarian-standards/sphere/standards')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(res.body).toHaveProperty('WASH');
                expect(res.body.WASH).toHaveProperty('waterQuantity');
                expect(res.body.WASH.waterQuantity.min).toBe(15);
            });
        });

        describe('POST /api/v1/humanitarian-standards/sphere/assess', () => {
            it('should assess WASH compliance', async () => {
                const facilityData = {
                    population: 500,
                    waterSupplyLiters: 10000, // 20 liters/person - compliant
                    toiletCount: 20, // 25 people/toilet - non-compliant
                };

                const res = await request(app.getHttpServer())
                    .post('/api/v1/humanitarian-standards/sphere/assess')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ facilityData, category: 'WASH' })
                    .expect(201);

                expect(res.body).toHaveProperty('assessments');
                expect(res.body.assessments.length).toBeGreaterThan(0);
                
                const waterAssessment = res.body.assessments.find(
                    (a: any) => a.indicator === 'Water Quantity'
                );
                expect(waterAssessment.compliant).toBe(true);
            });
        });

        describe('POST /api/v1/humanitarian-standards/3w/generate', () => {
            it('should generate 3W matrix from missions', async () => {
                const mockMissions = [
                    {
                        id: 'mission-001',
                        name: 'Flood Response Taipei',
                        startTime: new Date().toISOString(),
                        status: 'active',
                        location: { county: 'Taipei', district: 'Xinyi' },
                        beneficiaryCount: 200,
                    },
                ];

                const res = await request(app.getHttpServer())
                    .post('/api/v1/humanitarian-standards/3w/generate')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        missions: mockMissions,
                        period: {
                            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                            end: new Date().toISOString(),
                        },
                    })
                    .expect(201);

                expect(res.body).toHaveProperty('entries');
                expect(res.body).toHaveProperty('summary');
                expect(res.body.summary.totalActivities).toBe(1);
            });
        });
    });

    // ==========================================
    // Staff Security Module Tests
    // ==========================================
    describe('StaffSecurityModule', () => {
        describe('POST /api/v1/staff-security/incidents', () => {
            it('should report a security incident', async () => {
                const incident = {
                    type: 'theft',
                    severity: 'medium',
                    description: 'Equipment stolen from vehicle',
                    location: {
                        latitude: 25.0330,
                        longitude: 121.5654,
                        address: 'Taipei, Taiwan',
                    },
                    reporterId: 'staff-001',
                };

                const res = await request(app.getHttpServer())
                    .post('/api/v1/staff-security/incidents')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(incident)
                    .expect(201);

                expect(res.body).toHaveProperty('id');
                expect(res.body.type).toBe('theft');
                expect(res.body.status).toBe('reported');
            });
        });

        describe('GET /api/v1/staff-security/incidents/active', () => {
            it('should return active security incidents', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/staff-security/incidents/active')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(Array.isArray(res.body)).toBe(true);
            });
        });

        describe('POST /api/v1/staff-security/check-in', () => {
            it('should record a staff check-in', async () => {
                const checkIn = {
                    staffId: 'staff-001',
                    type: 'routine',
                    location: {
                        latitude: 25.0330,
                        longitude: 121.5654,
                    },
                    message: 'All good at site',
                    missionId: 'mission-001',
                };

                const res = await request(app.getHttpServer())
                    .post('/api/v1/staff-security/check-in')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(checkIn)
                    .expect(201);

                expect(res.body).toHaveProperty('id');
                expect(res.body.type).toBe('routine');
            });
        });

        describe('POST /api/v1/staff-security/panic', () => {
            it('should trigger panic button', async () => {
                const panicData = {
                    location: {
                        latitude: 25.0330,
                        longitude: 121.5654,
                    },
                    message: 'Emergency!',
                };

                const res = await request(app.getHttpServer())
                    .post('/api/v1/staff-security/panic')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(panicData)
                    .expect(201);

                expect(res.body).toHaveProperty('id');
                expect(res.body.type).toBe('panic');
            });
        });

        describe('POST /api/v1/staff-security/evacuation/plans', () => {
            it('should create an evacuation plan', async () => {
                const plan = {
                    locationId: 'location-001',
                    plan: {
                        name: 'Taipei Office Evacuation',
                        triggers: [
                            { type: 'earthquake', threshold: 'M5.0+' },
                        ],
                        routes: [
                            {
                                id: 'route-01',
                                name: 'Main Exit',
                                primary: true,
                                waypoints: [
                                    { lat: 25.0330, lon: 121.5654, description: 'Front door' },
                                ],
                                estimatedTimeMinutes: 5,
                            },
                        ],
                        assemblyPoints: [
                            {
                                id: 'ap-01',
                                name: 'Park across street',
                                latitude: 25.0335,
                                longitude: 121.5660,
                                capacity: 100,
                                facilities: ['first-aid', 'water'],
                            },
                        ],
                    },
                };

                const res = await request(app.getHttpServer())
                    .post('/api/v1/staff-security/evacuation/plans')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(plan)
                    .expect(201);

                expect(res.body).toHaveProperty('id');
                expect(res.body.name).toBe('Taipei Office Evacuation');
            });
        });
    });
});
