import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * E2E Test Utilities
 * Provides helper functions for authentication and common test scenarios
 */

// Role levels matching the application's ROLE_LEVELS
export const TEST_ROLE_LEVELS = {
    PUBLIC: 0,
    VOLUNTEER: 1,
    OFFICER: 2,
    DIRECTOR: 3,
    PRESIDENT: 4,
    OWNER: 5,
};

// Test user payloads for different role levels
export interface TestUserPayload {
    sub: string;
    email: string;
    name: string;
    roleLevel: number;
    roles: string[];
}

export const TEST_USERS: Record<string, TestUserPayload> = {
    anonymous: {
        sub: '',
        email: '',
        name: 'Anonymous',
        roleLevel: 0,
        roles: [],
    },
    volunteer: {
        sub: '11111111-1111-1111-1111-111111111111',
        email: 'volunteer@test.com',
        name: 'Test Volunteer',
        roleLevel: 1,
        roles: ['volunteer'],
    },
    officer: {
        sub: '22222222-2222-2222-2222-222222222222',
        email: 'officer@test.com',
        name: 'Test Officer',
        roleLevel: 2,
        roles: ['officer'],
    },
    director: {
        sub: '33333333-3333-3333-3333-333333333333',
        email: 'director@test.com',
        name: 'Test Director',
        roleLevel: 3,
        roles: ['director'],
    },
    president: {
        sub: '44444444-4444-4444-4444-444444444444',
        email: 'president@test.com',
        name: 'Test President',
        roleLevel: 4,
        roles: ['president'],
    },
    owner: {
        sub: '55555555-5555-5555-5555-555555555555',
        email: 'owner@test.com',
        name: 'System Owner',
        roleLevel: 5,
        roles: ['owner'],
    },
};

/**
 * Generate a test JWT token for a specific user
 */
export function generateTestToken(jwtService: JwtService, user: TestUserPayload): string {
    return jwtService.sign({
        sub: user.sub,
        email: user.email,
        name: user.name,
        roleLevel: user.roleLevel,
        roles: user.roles,
    });
}

/**
 * Create a test application instance
 */
export async function createTestApp(): Promise<{
    app: INestApplication;
    moduleRef: TestingModule;
    jwtService: JwtService;
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const jwtService = moduleRef.get<JwtService>(JwtService);

    return { app, moduleRef, jwtService };
}

/**
 * Test helper class for making authenticated requests
 */
export class TestClient {
    constructor(
        private readonly app: INestApplication,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Make an unauthenticated request
     */
    request() {
        return request(this.app.getHttpServer());
    }

    /**
     * Make a request as a specific user
     */
    as(user: TestUserPayload) {
        const token = generateTestToken(this.jwtService, user);
        return {
            get: (url: string) =>
                request(this.app.getHttpServer())
                    .get(url)
                    .set('Authorization', `Bearer ${token}`),
            post: (url: string) =>
                request(this.app.getHttpServer())
                    .post(url)
                    .set('Authorization', `Bearer ${token}`),
            patch: (url: string) =>
                request(this.app.getHttpServer())
                    .patch(url)
                    .set('Authorization', `Bearer ${token}`),
            delete: (url: string) =>
                request(this.app.getHttpServer())
                    .delete(url)
                    .set('Authorization', `Bearer ${token}`),
        };
    }

    /**
     * Shorthand for making requests as different role levels
     */
    asAnonymous = () => this.request();
    asVolunteer = () => this.as(TEST_USERS.volunteer);
    asOfficer = () => this.as(TEST_USERS.officer);
    asDirector = () => this.as(TEST_USERS.director);
    asPresident = () => this.as(TEST_USERS.president);
    asOwner = () => this.as(TEST_USERS.owner);
    asAdmin = () => this.as(TEST_USERS.owner); // Alias for asOwner
}

/**
 * Standard test scenarios for authorization
 */
export const authTestScenarios = {
    /**
     * Test that endpoint requires authentication (expects 401)
     */
    requiresAuth: async (client: TestClient, method: 'get' | 'post' | 'patch' | 'delete', url: string) => {
        const response = await (client.request() as any)[method](url);
        expect(response.status).toBe(401);
    },

    /**
     * Test that endpoint requires specific role level (expects 403 for lower levels)
     */
    requiresRole: async (
        client: TestClient,
        method: 'get' | 'post' | 'patch' | 'delete',
        url: string,
        requiredLevel: number,
    ) => {
        // Test with insufficient role
        if (requiredLevel > 1) {
            const response = await (client.asVolunteer() as any)[method](url);
            expect(response.status).toBe(403);
        }
    },

    /**
     * Test that endpoint returns success for authorized user (expects 200/201)
     */
    allowsAuthorized: async (
        client: TestClient,
        method: 'get' | 'post' | 'patch' | 'delete',
        url: string,
        user: TestUserPayload,
        body?: any,
    ) => {
        let response;
        if (body) {
            response = await (client.as(user) as any)[method](url).send(body);
        } else {
            response = await (client.as(user) as any)[method](url);
        }
        expect([200, 201]).toContain(response.status);
        return response;
    },
};
