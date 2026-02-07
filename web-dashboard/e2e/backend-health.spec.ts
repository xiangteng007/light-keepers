import { test, expect } from '@playwright/test';

/**
 * Backend API health check tests
 * Requires backend running at BACKEND_URL or defaults to https://light-keepers-backend-165104482190.asia-east1.run.app
 */
const BACKEND_URL = process.env.E2E_BACKEND_URL ||
    'https://light-keepers-backend-165104482190.asia-east1.run.app';

test.describe('Backend Health', () => {

    test('health endpoint returns OK', async ({ request }) => {
        const response = await request.get(`${BACKEND_URL}/health`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('ok');
    });

    test('API ping responds', async ({ request }) => {
        const response = await request.get(`${BACKEND_URL}/api/v1/public/ping`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.status).toBeTruthy();
    });
});
