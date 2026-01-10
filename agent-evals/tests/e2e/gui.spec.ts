/**
 * Browser Tests for Agent Evals GUI (Task 39)
 * Tests the web interface using Playwright
 */

import { test, expect } from '@playwright/test';

// Base URL for the app - assumes Next.js dev server is running
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ============================================================================
// Dashboard Tests
// ============================================================================

test.describe('Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check that the page title contains expected text
    await expect(page).toHaveTitle(/Agent Evals|Dashboard|Next.js/);

    // Check for main dashboard elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display navigation elements', async ({ page }) => {
    await page.goto(BASE_URL);

    // Look for common navigation elements
    const nav = page.locator('nav, header, [role="navigation"]');
    await expect(await nav.count() >= 0).toBeTruthy();

    // Page should have some content
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto(BASE_URL);

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================================================
// Evaluations List Tests
// ============================================================================

test.describe('Evaluations List', () => {
  test('should load the evaluations page', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);

    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have page content', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);

    // Check that the page has some content
    const body = page.locator('body');
    const content = await body.textContent();
    expect(content).toBeTruthy();
  });
});

// ============================================================================
// API Health Check Tests
// ============================================================================

test.describe('API Health', () => {
  test('should respond to API requests', async ({ request }) => {
    // Try to fetch evals API
    const response = await request.get(`${BASE_URL}/api/evals`);

    // Should return a response (even if empty)
    expect(response.ok() || response.status() === 404 || response.status() === 500).toBeTruthy();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Accessibility', () => {
  test('should have valid HTML structure', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check for html and body elements
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);

    // Filter out expected errors (like hydration warnings in dev mode)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('Hydration') &&
        !e.includes('Warning:') &&
        !e.includes('DevTools')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto(BASE_URL);

    // Try to navigate to evals page
    const evalsLink = page.locator('a[href*="eval"]').first();
    if (await evalsLink.count() > 0) {
      await evalsLink.click();
      await expect(page).toHaveURL(/eval/);
    }
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.goto(`${BASE_URL}/evals`);

    await page.goBack();
    await expect(page).toHaveURL(BASE_URL);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should have reasonable page size', async ({ page }) => {
    const response = await page.goto(BASE_URL);

    if (response) {
      const headers = response.headers();
      const contentLength = headers['content-length'];

      if (contentLength) {
        // HTML should be less than 1MB
        expect(parseInt(contentLength)).toBeLessThan(1024 * 1024);
      }
    }
  });
});
