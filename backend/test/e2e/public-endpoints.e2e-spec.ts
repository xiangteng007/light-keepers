/**
 * Public Endpoints E2E Tests
 *
 * PR #1: P0-2 Public Endpoint Service Injection Verification
 *
 * Tests all Level 0 (public, no-auth) endpoints:
 * - GET /api/v1/public/announcements
 * - GET /api/v1/public/shelters
 * - GET /api/v1/public/aed
 * - GET /api/v1/public/alerts
 * - GET /api/v1/public/weather
 * - GET /api/v1/public/ping
 * - GET /api/v1/public/info
 *
 * Security: All endpoints must be accessible without authentication.
 * Response: All endpoints must return valid JSON with correct schema.
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Public Endpoints (E2E)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    // ============================================================
    // GET /api/v1/public/ping - Health Check
    // ============================================================
    describe('GET /api/v1/public/ping', () => {
        it('should return 200 with status ok', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/ping')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'ok');
            expect(response.body).toHaveProperty('timestamp');
            expect(typeof response.body.timestamp).toBe('string');
        });

        it('should not require authentication', async () => {
            // No Authorization header
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/ping');

            expect(response.status).toBe(200);
        });
    });

    // ============================================================
    // GET /api/v1/public/info - Platform Info
    // ============================================================
    describe('GET /api/v1/public/info', () => {
        it('should return platform information', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/info')
                .expect(200);

            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('description');
            expect(response.body).toHaveProperty('contact');
            expect(response.body.contact).toHaveProperty('email');
        });
    });

    // ============================================================
    // GET /api/v1/public/announcements - Public Announcements
    // ============================================================
    describe('GET /api/v1/public/announcements', () => {
        it('should return 200 with announcements array', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/announcements')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(typeof response.body.total).toBe('number');
        });

        it('should accept limit query parameter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/announcements?limit=5')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body.data.length).toBeLessThanOrEqual(5);
        });

        it('should accept category query parameter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/announcements?category=emergency')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });

        it('should return correct schema for each announcement', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/announcements?limit=1')
                .expect(200);

            if (response.body.data.length > 0) {
                const announcement = response.body.data[0];
                expect(announcement).toHaveProperty('id');
                expect(announcement).toHaveProperty('title');
                expect(announcement).toHaveProperty('content');
                expect(announcement).toHaveProperty('category');
                expect(announcement).toHaveProperty('publishedAt');
            }
        });
    });

    // ============================================================
    // GET /api/v1/public/shelters - Public Shelters
    // ============================================================
    describe('GET /api/v1/public/shelters', () => {
        it('should return 200 with shelters array', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/shelters')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should accept lat/lng query parameters', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/shelters?lat=25.0330&lng=121.5654')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });

        it('should accept radius query parameter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/shelters?lat=25.0330&lng=121.5654&radius=10')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });

        it('should accept type filter query parameter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/shelters?type=indoor')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });

        it('should return correct schema for each shelter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/shelters')
                .expect(200);

            if (response.body.data.length > 0) {
                const shelter = response.body.data[0];
                expect(shelter).toHaveProperty('id');
                expect(shelter).toHaveProperty('name');
                expect(shelter).toHaveProperty('address');
                expect(shelter).toHaveProperty('latitude');
                expect(shelter).toHaveProperty('longitude');
                expect(shelter).toHaveProperty('capacity');
                expect(shelter).toHaveProperty('type');
            }
        });
    });

    // ============================================================
    // GET /api/v1/public/aed - Public AED Locations
    // ============================================================
    describe('GET /api/v1/public/aed', () => {
        it('should return 200 with AED locations array', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/aed')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should accept lat/lng/radius query parameters', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/aed?lat=25.0330&lng=121.5654&radius=2')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });
    });

    // ============================================================
    // GET /api/v1/public/alerts - Public Alerts (NCDR)
    // ============================================================
    describe('GET /api/v1/public/alerts', () => {
        it('should return 200 with alerts array', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/alerts')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should accept severity filter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/alerts?severity=warning')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });

        it('should accept category filter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/alerts?category=earthquake')
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });

        it('should return correct schema for each alert', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/alerts')
                .expect(200);

            if (response.body.data.length > 0) {
                const alert = response.body.data[0];
                expect(alert).toHaveProperty('id');
                expect(alert).toHaveProperty('title');
                expect(alert).toHaveProperty('description');
                expect(alert).toHaveProperty('severity');
                expect(alert).toHaveProperty('category');
                expect(alert).toHaveProperty('effectiveAt');
                expect(alert).toHaveProperty('affectedAreas');
            }
        });
    });

    // ============================================================
    // GET /api/v1/public/weather - Public Weather
    // ============================================================
    describe('GET /api/v1/public/weather', () => {
        it('should return 200 with weather data', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/weather')
                .expect(200);

            // May return object (single) or array (multiple)
            expect(response.body).toBeDefined();
            if (response.body.data) {
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });

        it('should accept location query parameter', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/weather?location=台北市')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should return correct schema for weather', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/public/weather')
                .expect(200);

            // Check if data or single object
            const weather = response.body.data?.[0] || response.body;
            if (weather && weather.location) {
                expect(weather).toHaveProperty('location');
                expect(weather).toHaveProperty('temperature');
                expect(weather).toHaveProperty('description');
                expect(weather).toHaveProperty('humidity');
                expect(weather).toHaveProperty('windSpeed');
                expect(weather).toHaveProperty('updatedAt');
            }
        });
    });

    // ============================================================
    // Security: All endpoints require no authentication
    // ============================================================
    describe('Security: No Authentication Required', () => {
        const publicEndpoints = [
            '/api/v1/public/ping',
            '/api/v1/public/info',
            '/api/v1/public/announcements',
            '/api/v1/public/shelters',
            '/api/v1/public/aed',
            '/api/v1/public/alerts',
            '/api/v1/public/weather',
        ];

        publicEndpoints.forEach((endpoint) => {
            it(`${endpoint} should be accessible without auth`, async () => {
                const response = await request(app.getHttpServer())
                    .get(endpoint);

                // Should NOT return 401 Unauthorized
                expect(response.status).not.toBe(401);
                // Should return 200 (success)
                expect(response.status).toBe(200);
            });
        });
    });
});
