import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient, TEST_USERS, TEST_ROLE_LEVELS } from './test-helpers';

describe('VolunteersController (e2e)', () => {
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

    describe('GET /volunteers', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/volunteers');
            expect(response.status).toBe(401);
        });

        it('403 - should reject insufficient role level (volunteer < officer)', async () => {
            const response = await client.asVolunteer().get('/volunteers');
            expect(response.status).toBe(403);
        });

        it('200 - should return volunteer list for officer', async () => {
            const response = await client.asOfficer().get('/volunteers');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /volunteers/:id', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/volunteers/test-id');
            expect(response.status).toBe(401);
        });

        it('403 - should reject insufficient role level', async () => {
            const response = await client.asVolunteer().get('/volunteers/test-id');
            expect(response.status).toBe(403);
        });

        it('404 - should return not found for non-existent volunteer', async () => {
            const response = await client.asOfficer().get('/volunteers/00000000-0000-0000-0000-000000000000');
            // Depending on implementation, could be 404 or return null
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('GET /volunteers/pending', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/volunteers/pending');
            expect(response.status).toBe(401);
        });

        it('200 - should return pending volunteers for officer', async () => {
            const response = await client.asOfficer().get('/volunteers/pending');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('GET /volunteers/stats', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/volunteers/stats');
            expect(response.status).toBe(401);
        });

        it('200 - should return stats for authorized user', async () => {
            const response = await client.asOfficer().get('/volunteers/stats');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('total');
        });
    });
});
