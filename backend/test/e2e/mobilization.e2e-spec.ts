/**
 * mobilization.e2e-spec.ts
 * 
 * E2E Test Suite for Volunteer Mobilization Scenario
 * Tests the volunteer mobilization flow:
 * 1. Create Mobilization Order
 * 2. Activate Mobilization
 * 3. Volunteer Response (Confirm/Decline)
 * 4. Volunteer Check-in
 * 5. Statistics Query
 */
import { INestApplication } from '@nestjs/common';
import { TestClient, TEST_USERS, createTestApp } from './test-helpers';

describe('Volunteer Mobilization E2E Scenario', () => {
    let app: INestApplication;
    let client: TestClient;

    // Track created resources
    let createdMobilizationId: string;

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

    describe('Step 1: Create Mobilization Order', () => {
        it('should require DIRECTOR level to create mobilization', async () => {
            const response = await client.asOfficer()
                .post('/volunteers/mobilization')
                .send({
                    title: 'Test Mobilization',
                    requiredCount: 10,
                });
            expect(response.status).toBe(403);
        });

        it('should allow DIRECTOR to create mobilization order', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const response = await client.asDirector()
                .post('/volunteers/mobilization')
                .send({
                    title: 'E2E Flood Response Mobilization',
                    description: 'Emergency flood response in Taipei area',
                    missionSessionId: 'test-mission-456',
                    requiredCount: 20,
                    requiredSkills: ['first_aid', 'driving'],
                    location: {
                        address: 'Taipei Flood Area',
                        latitude: 25.0330,
                        longitude: 121.5654,
                    },
                    startTime: tomorrow.toISOString(),
                    endTime: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000).toISOString(),
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.title).toBe('E2E Flood Response Mobilization');
            expect(response.body.status).toBe('DRAFT');
            expect(response.body.requiredCount).toBe(20);
            createdMobilizationId = response.body.id;
        });
    });

    describe('Step 2: Activate Mobilization', () => {
        it('should require DIRECTOR level to activate', async () => {
            const response = await client.asOfficer()
                .post(`/volunteers/mobilization/${createdMobilizationId}/activate`)
                .send({});
            expect(response.status).toBe(403);
        });

        it('should allow DIRECTOR to activate and notify volunteers', async () => {
            const response = await client.asDirector()
                .post(`/volunteers/mobilization/${createdMobilizationId}/activate`)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ACTIVE');
            expect(response.body.activatedAt).toBeDefined();
        });
    });

    describe('Step 3: Volunteer Response', () => {
        it('should allow VOLUNTEER to respond to mobilization', async () => {
            const response = await client.asVolunteer()
                .post(`/volunteers/mobilization/${createdMobilizationId}/respond`)
                .send({
                    status: 'CONFIRMED',
                    notes: 'Available and ready to help',
                    estimatedArrivalTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('CONFIRMED');
        });

        it('should allow volunteer to update response to DECLINED', async () => {
            // Use officer as another volunteer to test decline
            const response = await client.asOfficer()
                .post(`/volunteers/mobilization/${createdMobilizationId}/respond`)
                .send({
                    status: 'DECLINED',
                    notes: 'Unable to attend due to prior commitment',
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('DECLINED');
        });
    });

    describe('Step 4: Volunteer Check-in', () => {
        it('should allow VOLUNTEER to check-in at location', async () => {
            const response = await client.asVolunteer()
                .post(`/volunteers/mobilization/${createdMobilizationId}/checkin`)
                .send({
                    latitude: 25.0331,
                    longitude: 121.5655,
                });

            expect(response.status).toBe(200);
            expect(response.body.checkedInAt).toBeDefined();
            expect(response.body.checkinLatitude).toBeDefined();
        });
    });

    describe('Step 5: Mobilization Statistics', () => {
        it('should require OFFICER level to view statistics', async () => {
            const response = await client.asVolunteer()
                .get(`/volunteers/mobilization/${createdMobilizationId}/stats`);
            expect(response.status).toBe(403);
        });

        it('should allow OFFICER to view mobilization statistics', async () => {
            const response = await client.asOfficer()
                .get(`/volunteers/mobilization/${createdMobilizationId}/stats`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalResponses');
            expect(response.body).toHaveProperty('confirmed');
            expect(response.body).toHaveProperty('declined');
            expect(response.body).toHaveProperty('checkedIn');
        });
    });

    describe('Step 6: Complete Mobilization', () => {
        it('should require DIRECTOR level to complete mobilization', async () => {
            const response = await client.asOfficer()
                .post(`/volunteers/mobilization/${createdMobilizationId}/complete`)
                .send({});
            expect(response.status).toBe(403);
        });

        it('should allow DIRECTOR to complete mobilization', async () => {
            const response = await client.asDirector()
                .post(`/volunteers/mobilization/${createdMobilizationId}/complete`)
                .send({
                    summary: 'Successfully completed flood response operation',
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('COMPLETED');
        });
    });

    describe('Authorization Matrix', () => {
        it('should deny unauthenticated access', async () => {
            const response = await client.asAnonymous()
                .get('/volunteers/mobilization');
            expect(response.status).toBe(401);
        });

        it('should allow VOLUNTEER to view their mobilizations', async () => {
            const response = await client.asVolunteer()
                .get('/volunteers/mobilization/my');
            expect([200, 404]).toContain(response.status);
        });
    });
});
