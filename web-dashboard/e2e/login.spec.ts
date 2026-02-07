import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
    test('should display login page for unauthenticated users', async ({ page }) => {
        await page.goto('/');
        // Should redirect to login or show login UI
        await expect(page).toHaveURL(/login|auth/);
    });

    test('should show OAuth login buttons', async ({ page }) => {
        await page.goto('/login');

        // Check for LINE and Google OAuth buttons
        const lineButton = page.getByRole('button', { name: /LINE/i })
            .or(page.locator('[class*="line"]').filter({ hasText: /LINE/i }));
        const googleButton = page.getByRole('button', { name: /Google/i })
            .or(page.locator('[class*="google"]').filter({ hasText: /Google/i }));

        // At least one OAuth button should exist
        const lineCount = await lineButton.count();
        const googleCount = await googleButton.count();
        expect(lineCount + googleCount).toBeGreaterThan(0);
    });

    test('should have proper page title', async ({ page }) => {
        await page.goto('/login');
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);
    });
});
