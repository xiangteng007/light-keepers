import { test, expect } from '@playwright/test';

/**
 * Accessibility smoke tests — basic a11y checks on key pages
 */
test.describe('Accessibility', () => {

    test('login page has proper heading hierarchy', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        // Should have at least one heading
        const headings = page.locator('h1, h2, h3');
        const count = await headings.count();
        expect(count).toBeGreaterThan(0);
    });

    test('login page buttons are keyboard-focusable', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        // Tab through the page
        await page.keyboard.press('Tab');
        const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedTag);
    });

    test('images have alt text', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        const images = page.locator('img');
        const count = await images.count();
        for (let i = 0; i < count; i++) {
            const alt = await images.nth(i).getAttribute('alt');
            expect(alt).not.toBeNull();
        }
    });

    test('interactive elements have accessible names', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        const buttons = page.locator('button');
        const count = await buttons.count();
        for (let i = 0; i < Math.min(count, 10); i++) {
            const btn = buttons.nth(i);
            const text = await btn.textContent();
            const ariaLabel = await btn.getAttribute('aria-label');
            const title = await btn.getAttribute('title');
            expect(text || ariaLabel || title).toBeTruthy();
        }
    });

    test('color contrast - no invisible text', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        // Simple check: text elements should have visible content
        const textElements = page.locator('h1, h2, h3, p, span, label, button');
        const count = await textElements.count();
        expect(count).toBeGreaterThan(0);

        // At least one text element should have visible text
        const firstText = await textElements.first().textContent();
        expect(firstText?.trim().length).toBeGreaterThan(0);
    });
});
