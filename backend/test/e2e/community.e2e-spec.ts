import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient, TEST_USERS, TEST_ROLE_LEVELS } from './test-helpers';

describe('CommunityController (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let client: TestClient;
    let createdPostId: string;

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

    // ===== Posts =====

    describe('GET /community/posts', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/community/posts');
            expect(response.status).toBe(401);
        });

        it('200 - should return posts for volunteer', async () => {
            const response = await client.asVolunteer().get('/community/posts');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('POST /community/posts', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/community/posts')
                .send({ content: 'Test' });
            expect(response.status).toBe(401);
        });

        it('201 - should create post for volunteer', async () => {
            const postData = {
                authorId: TEST_USERS.volunteer.sub,
                authorName: TEST_USERS.volunteer.name,
                content: 'E2E Test Post Content',
                category: 'general',
            };

            const response = await client.asVolunteer()
                .post('/community/posts')
                .send(postData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id');

            // Save for later tests
            createdPostId = response.body.data.id;
        });
    });

    describe('GET /community/posts/:id', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/community/posts/test-id');
            expect(response.status).toBe(401);
        });

        it('200 - should return post for volunteer', async () => {
            if (!createdPostId) {
                return; // Skip if no post was created
            }

            const response = await client.asVolunteer().get(`/community/posts/${createdPostId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id', createdPostId);
        });
    });

    // ===== IDOR Protection Tests =====

    describe('PATCH /community/posts/:id (IDOR protection)', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .patch('/community/posts/test-id')
                .send({ content: 'Updated content' });
            expect(response.status).toBe(401);
        });

        it('403 - should reject update by non-owner (IDOR test)', async () => {
            if (!createdPostId) {
                return; // Skip if no post was created
            }

            // Create a different user token (not the post owner)
            const differentUser = {
                ...TEST_USERS.volunteer,
                sub: '99999999-9999-9999-9999-999999999999',
                name: 'Different User',
            };

            const response = await client.as(differentUser)
                .patch(`/community/posts/${createdPostId}`)
                .send({ content: 'Trying to update someone else post' });

            // Should be forbidden because the user is not the owner
            expect(response.status).toBe(403);
        });

        it('200 - should allow update by owner', async () => {
            if (!createdPostId) {
                return; // Skip if no post was created
            }

            const response = await client.asVolunteer()
                .patch(`/community/posts/${createdPostId}`)
                .send({ content: 'Updated by owner' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        it('200 - should allow update by officer (bypass level)', async () => {
            if (!createdPostId) {
                return; // Skip if no post was created
            }

            const response = await client.asOfficer()
                .patch(`/community/posts/${createdPostId}`)
                .send({ content: 'Updated by officer' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('DELETE /community/posts/:id (IDOR protection)', () => {
        let testPostId: string;

        beforeAll(async () => {
            // Create a post to delete
            const postData = {
                authorId: TEST_USERS.volunteer.sub,
                authorName: TEST_USERS.volunteer.name,
                content: 'Post to be deleted',
                category: 'general',
            };

            const response = await client.asVolunteer()
                .post('/community/posts')
                .send(postData);

            if (response.status === 201) {
                testPostId = response.body.data.id;
            }
        });

        it('403 - should reject deletion by non-owner (IDOR test)', async () => {
            if (!testPostId) {
                return; // Skip if no post was created
            }

            const differentUser = {
                ...TEST_USERS.volunteer,
                sub: '88888888-8888-8888-8888-888888888888',
                name: 'Another User',
            };

            const response = await client.as(differentUser).delete(`/community/posts/${testPostId}`);
            expect(response.status).toBe(403);
        });

        it('200 - should allow deletion by owner', async () => {
            if (!testPostId) {
                return; // Skip if no post was created
            }

            const response = await client.asVolunteer().delete(`/community/posts/${testPostId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    // ===== Likes =====

    describe('POST /community/posts/:postId/like', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request()
                .post('/community/posts/test-id/like');
            expect(response.status).toBe(401);
        });

        it('200 - should toggle like for authenticated user', async () => {
            if (!createdPostId) {
                return; // Skip if no post was created
            }

            const response = await client.asVolunteer()
                .post(`/community/posts/${createdPostId}/like`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('liked');
        });
    });

    // ===== Stats =====

    describe('GET /community/stats', () => {
        it('401 - should reject unauthenticated access', async () => {
            const response = await client.request().get('/community/stats');
            expect(response.status).toBe(401);
        });

        it('200 - should return stats for volunteer', async () => {
            const response = await client.asVolunteer().get('/community/stats');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('totalPosts');
        });
    });
});
