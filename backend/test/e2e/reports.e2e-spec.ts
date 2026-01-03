import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient, TEST_USERS, TEST_ROLE_LEVELS } from './test-helpers';

describe('ReportsController (e2e)', () => {
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

    // ===== Public Endpoints =====

    describe('POST /reports (public with rate limiting)', () => {
        it('201 - should allow anonymous report submission', async () => {
            const reportData = {
                type: 'flood',
                severity: 'medium',
                title: 'E2E Test Report',
                description: 'This is a test report from E2E tests',
                latitude: 25.0330,
                longitude: 121.5654,
                address: 'Test Address',
            };

            const response = await client.request()
                .post('/reports')
                .send(reportData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id');
        });
    });

    describe('GET /reports/map (public)', () => {
        it('200 - should return map data without authentication', async () => {
            const response = await client.request().get('/reports/map');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('GET /reports/stats (public)', () => {
        it('200 - should return stats without authentication', async () => {
            const response = await client.request().get('/reports/stats');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    // ===== Protected Endpoints =====

    describe('GET /reports (officer+)', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/reports');
            expect(response.status).toBe(401);
        });

        it('403 - should reject volunteer level', async () => {
            const response = await client.asVolunteer().get('/reports');
            expect(response.status).toBe(403);
        });

        it('200 - should return reports for officer', async () => {
            const response = await client.asOfficer().get('/reports');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /reports/:id (officer+)', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/reports/test-id');
            expect(response.status).toBe(401);
        });

        it('403 - should reject insufficient role', async () => {
            const response = await client.asVolunteer().get('/reports/test-id');
            expect(response.status).toBe(403);
        });
    });

    describe('PATCH /reports/:id/review (officer+)', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .patch('/reports/test-id/review')
                .send({ status: 'confirmed' });
            expect(response.status).toBe(401);
        });

        it('403 - should reject volunteer level', async () => {
            const response = await client.asVolunteer()
                .patch('/reports/test-id/review')
                .send({ status: 'confirmed' });
            expect(response.status).toBe(403);
        });
    });

    describe('DELETE /reports/:id (director+)', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().delete('/reports/test-id');
            expect(response.status).toBe(401);
        });

        it('403 - should reject officer level (requires director)', async () => {
            const response = await client.asOfficer().delete('/reports/test-id');
            expect(response.status).toBe(403);
        });
    });

    // ===== Analysis Endpoints (officer+) =====

    describe('GET /reports/analysis/hotspots', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/reports/analysis/hotspots');
            expect(response.status).toBe(401);
        });

        it('200 - should return hotspots for officer', async () => {
            const response = await client.asOfficer().get('/reports/analysis/hotspots');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });
});
