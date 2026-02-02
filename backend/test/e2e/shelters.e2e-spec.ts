/**
 * shelters.e2e-spec.ts
 * 
 * E2E Test Suite for Shelter Management Scenario
 * Tests the 8-step shelter operation flow:
 * 1. Create Shelter
 * 2. Activate Shelter
 * 3. Check-in Evacuee
 * 4. Health Screening
 * 5. Bed Assignment
 * 6. Daily Report
 * 7. Family Query (Public)
 * 8. Check-out Evacuee
 */
import { INestApplication } from '@nestjs/common';
import { TestClient, TEST_USERS, createTestApp } from './test-helpers';

describe('Shelter Management E2E Scenario', () => {
    let app: INestApplication;
    let client: TestClient;

    // Track created resources for cleanup
    let createdShelterId: string;
    let createdEvacueeId: string;
    let queryCode: string;

    beforeAll(async () => {
        const testSetup = await createTestApp();
        app = testSetup.app;
        client = new TestClient(app, testSetup.jwtService);
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('Step 1: Create Shelter', () => {
        it('should require DIRECTOR level to create shelter', async () => {
            const response = await client.asVolunteer().post('/shelters').send({
                name: 'Test Shelter',
                type: 'SCHOOL',
                address: '123 Test St',
                capacity: 100,
            });
            expect(response.status).toBe(403);
        });

        it('should allow DIRECTOR to create shelter', async () => {
            const response = await client.asDirector().post('/shelters').send({
                name: 'E2E Test Shelter',
                type: 'SCHOOL',
                address: '456 Main St, Test City',
                latitude: 25.0330,
                longitude: 121.5654,
                capacity: 200,
                contactName: 'Test Manager',
                contactPhone: '0912345678',
                facilities: ['wheelchair_accessible', 'kitchen', 'medical_station'],
            });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('E2E Test Shelter');
            expect(response.body.status).toBe('INACTIVE');
            createdShelterId = response.body.id;
        });
    });

    describe('Step 2: Activate Shelter', () => {
        it('should require DIRECTOR level to activate shelter', async () => {
            const response = await client.asOfficer()
                .post(`/shelters/${createdShelterId}/activate`)
                .send({});
            expect(response.status).toBe(403);
        });

        it('should allow DIRECTOR to activate shelter for emergency', async () => {
            const response = await client.asDirector()
                .post(`/shelters/${createdShelterId}/activate`)
                .send({
                    missionSessionId: 'test-mission-123',
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OPEN');
            expect(response.body.activatedAt).toBeDefined();
        });
    });

    describe('Step 3: Check-in Evacuee', () => {
        it('should require OFFICER level to check-in evacuees', async () => {
            const response = await client.asVolunteer()
                .post(`/shelters/${createdShelterId}/check-in`)
                .send({
                    name: 'Test Evacuee',
                });
            expect(response.status).toBe(403);
        });

        it('should allow OFFICER to check-in evacuee with query code', async () => {
            const response = await client.asOfficer()
                .post(`/shelters/${createdShelterId}/check-in`)
                .send({
                    name: 'Wang Xiaoming',
                    idNumber: 'A123456789',
                    age: 45,
                    gender: 'M',
                    phone: '0923456789',
                    emergencyContact: 'Wang Xiaohong',
                    emergencyPhone: '0934567890',
                    specialNeeds: ['ELDERLY'],
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('queryCode');
            expect(response.body.name).toBe('Wang Xiaoming');
            expect(response.body.status).toBe('CHECKED_IN');
            
            createdEvacueeId = response.body.id;
            queryCode = response.body.queryCode;
        });
    });

    describe('Step 4: Health Screening', () => {
        it('should require OFFICER level to perform health screening', async () => {
            const response = await client.asVolunteer()
                .post(`/shelters/${createdShelterId}/health-screening/${createdEvacueeId}`)
                .send({
                    temperature: 36.5,
                });
            expect(response.status).toBe(403);
        });

        it('should allow OFFICER to record health screening', async () => {
            const response = await client.asOfficer()
                .post(`/shelters/${createdShelterId}/health-screening/${createdEvacueeId}`)
                .send({
                    temperature: 36.8,
                    bloodPressure: '120/80',
                    symptoms: 'None',
                    medications: 'Aspirin',
                    allergies: 'Penicillin',
                    requiresImmediateAttention: false,
                    notes: 'Stable condition',
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.temperature).toBe('36.8');
            expect(response.body.requiresImmediateAttention).toBe(false);
        });
    });

    describe('Step 5: Bed Assignment', () => {
        it('should require OFFICER level to assign beds', async () => {
            const response = await client.asVolunteer()
                .patch(`/shelters/${createdShelterId}/assign-bed/${createdEvacueeId}`)
                .send({
                    bedAssignment: 'A-12',
                });
            expect(response.status).toBe(403);
        });

        it('should allow OFFICER to assign bed to evacuee', async () => {
            const response = await client.asOfficer()
                .patch(`/shelters/${createdShelterId}/assign-bed/${createdEvacueeId}`)
                .send({
                    bedAssignment: 'Block-A-Room-12',
                });

            expect(response.status).toBe(200);
            expect(response.body.bedAssignment).toBe('Block-A-Room-12');
        });
    });

    describe('Step 6: Daily Report', () => {
        it('should require OFFICER level to submit daily report', async () => {
            const response = await client.asVolunteer()
                .post(`/shelters/${createdShelterId}/daily-report`)
                .send({
                    reportDate: new Date().toISOString().split('T')[0],
                    totalEvacuees: 1,
                });
            expect(response.status).toBe(403);
        });

        it('should allow OFFICER to submit daily report', async () => {
            const response = await client.asOfficer()
                .post(`/shelters/${createdShelterId}/daily-report`)
                .send({
                    reportDate: new Date().toISOString().split('T')[0],
                    totalEvacuees: 45,
                    newArrivals: 12,
                    departures: 3,
                    medicalCases: 2,
                    supplyStatus: {
                        water: 'SUFFICIENT',
                        food: 'LOW',
                        blankets: 'SUFFICIENT',
                        medicine: 'CRITICAL',
                    },
                    issues: 'Generator fuel running low',
                    needs: 'Need more medical supplies and diesel fuel',
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.totalEvacuees).toBe(45);
            expect(response.body.newArrivals).toBe(12);
        });
    });

    describe('Step 7: Family Query (Public)', () => {
        it('should allow public query by query code', async () => {
            const response = await client.asAnonymous()
                .get(`/shelters/query/${queryCode}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', true);
            expect(response.body.evacuee.name).toBe('Wang Xiaoming');
            // Should mask sensitive info for public query
        });

        it('should return not found for invalid query code', async () => {
            const response = await client.asAnonymous()
                .get('/shelters/query/INVALID-CODE');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('found', false);
        });
    });

    describe('Step 8: Check-out Evacuee', () => {
        it('should require OFFICER level to check-out evacuees', async () => {
            const response = await client.asVolunteer()
                .post(`/shelters/${createdShelterId}/check-out/${createdEvacueeId}`)
                .send({});
            expect(response.status).toBe(403);
        });

        it('should allow OFFICER to check-out evacuee', async () => {
            const response = await client.asOfficer()
                .post(`/shelters/${createdShelterId}/check-out/${createdEvacueeId}`)
                .send({
                    destination: 'Home',
                    notes: 'Returned to family',
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('CHECKED_OUT');
            expect(response.body.checkedOutAt).toBeDefined();
        });
    });

    describe('Shelter Deactivation (Cleanup)', () => {
        it('should allow DIRECTOR to deactivate shelter', async () => {
            const response = await client.asDirector()
                .post(`/shelters/${createdShelterId}/deactivate`)
                .send({});

            expect([200, 201]).toContain(response.status);
        });
    });
});
