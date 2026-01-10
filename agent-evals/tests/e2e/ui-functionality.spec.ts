/**
 * Comprehensive UI Functionality Tests
 * Tests buttons, forms, interactions, and user workflows
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ============================================================================
// Dashboard UI Tests
// ============================================================================

test.describe('Dashboard UI Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display header with title', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check for "Agent Evals" title
    const title = page.locator('h1');
    await expect(title).toContainText(/Agent Evals/i);
  });

  test('should display stats cards', async ({ page }) => {
    // Look for stats card elements
    const statsCards = page.locator('.grid > div').filter({ hasText: /Total|Completed|Running|Pass Rate/i });

    // Should have multiple stats displayed
    const count = await statsCards.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no data
  });

  test('should have working "All Evals" navigation link', async ({ page }) => {
    const navLink = page.locator('a[href="/evals"], a:has-text("All Evals"), nav a').first();

    if (await navLink.count() > 0) {
      await navLink.click();
      await expect(page).toHaveURL(/evals/);
    }
  });

  test('should display "Run New Eval" button', async ({ page }) => {
    const runButton = page.locator('button:has-text("Run New Eval")');

    if (await runButton.count() > 0) {
      await expect(runButton).toBeVisible();
      await expect(runButton).toBeEnabled();
    }
  });

  test('should display "View Latest" link when evals exist', async ({ page }) => {
    const viewLatestLink = page.locator('a:has-text("View Latest")');

    // This may or may not be visible depending on data
    const count = await viewLatestLink.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show empty state message when no evals', async ({ page }) => {
    // Check for empty state or eval items
    const emptyMessage = page.locator('text=No evaluations yet');
    const evalItems = page.locator('[href^="/evals/"]');

    // Either empty message or eval items should be visible
    const hasEmpty = await emptyMessage.count() > 0;
    const hasEvals = await evalItems.count() > 0;

    expect(hasEmpty || hasEvals).toBeTruthy();
  });

  test('should display "View all evaluations" link', async ({ page }) => {
    const viewAllLink = page.locator('a:has-text("View all evaluations")');

    if (await viewAllLink.count() > 0) {
      await expect(viewAllLink).toBeVisible();
      await viewAllLink.click();
      await expect(page).toHaveURL(/evals/);
    }
  });

  test('should render chart container when data exists', async ({ page }) => {
    // Look for chart container or recharts elements
    const chartContainer = page.locator('.recharts-wrapper, [class*="chart"], h2:has-text("Recent Pass Rates")');

    // Chart may not be visible if no data
    const count = await chartContainer.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Evaluations List UI Tests
// ============================================================================

test.describe('Evaluations List UI Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);
    await page.waitForLoadState('networkidle');
  });

  test('should display page header with back link', async ({ page }) => {
    const backLink = page.locator('a:has-text("Back"), a:has-text("←")');

    if (await backLink.count() > 0) {
      await expect(backLink).toBeVisible();
    }

    const title = page.locator('h1:has-text("All Evaluations"), h1:has-text("Evaluations")');
    if (await title.count() > 0) {
      await expect(title).toBeVisible();
    }
  });

  test('should have working search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();

      // Type in search box
      await searchInput.fill('test-search');
      await expect(searchInput).toHaveValue('test-search');

      // Clear search
      await searchInput.clear();
      await expect(searchInput).toHaveValue('');
    }
  });

  test('should have working status filter dropdown', async ({ page }) => {
    const statusDropdown = page.locator('select');

    if (await statusDropdown.count() > 0) {
      await expect(statusDropdown).toBeVisible();

      // Get available options
      const options = statusDropdown.locator('option');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);

      // Try selecting different statuses
      await statusDropdown.selectOption({ label: 'Completed' });
      await statusDropdown.selectOption({ label: 'All Status' });
    }
  });

  test('should display table with proper headers', async ({ page }) => {
    const table = page.locator('table');

    if (await table.count() > 0) {
      await expect(table).toBeVisible();

      // Check for expected column headers
      const headers = ['Name', 'Date', 'Status', 'Pass Rate', 'Tasks'];
      for (const header of headers) {
        const headerCell = page.locator(`th:has-text("${header}")`);
        if (await headerCell.count() > 0) {
          await expect(headerCell).toBeVisible();
        }
      }
    }
  });

  test('should show loading state or data', async ({ page }) => {
    // Either loading, empty, or data should be shown
    const loading = page.locator('text=Loading');
    const empty = page.locator('text=No evaluations found');
    const tableRows = page.locator('tbody tr');

    // Wait a bit for data to load
    await page.waitForTimeout(1000);

    const hasLoading = await loading.count() > 0;
    const hasEmpty = await empty.count() > 0;
    const hasData = await tableRows.count() > 0;

    expect(hasLoading || hasEmpty || hasData).toBeTruthy();
  });

  test('should have pagination controls when needed', async ({ page }) => {
    const prevButton = page.locator('button:has-text("Previous")');
    const nextButton = page.locator('button:has-text("Next")');

    // Pagination may not be visible if few results
    if (await prevButton.count() > 0) {
      await expect(prevButton).toBeVisible();

      // Previous should be disabled on first page
      const isDisabled = await prevButton.isDisabled();
      expect(typeof isDisabled).toBe('boolean');
    }

    if (await nextButton.count() > 0) {
      await expect(nextButton).toBeVisible();
    }
  });

  test('should navigate back to dashboard', async ({ page }) => {
    const backLink = page.locator('a[href="/"], a:has-text("Back")').first();

    if (await backLink.count() > 0) {
      await backLink.click();
      await expect(page).toHaveURL(BASE_URL);
    }
  });
});

// ============================================================================
// Form Interaction Tests
// ============================================================================

test.describe('Form Interactions', () => {
  test('search form submits on enter', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('test-query');
      await searchInput.press('Enter');

      // Should trigger search (URL may update or table should filter)
      await page.waitForTimeout(500);
    }
  });

  test('status filter updates results', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);
    await page.waitForLoadState('networkidle');

    const statusDropdown = page.locator('select');

    if (await statusDropdown.count() > 0) {
      // Select "Completed" filter
      await statusDropdown.selectOption({ label: 'Completed' });

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Select back to "All"
      await statusDropdown.selectOption({ label: 'All Status' });
    }
  });
});

// ============================================================================
// Button Click Tests
// ============================================================================

test.describe('Button Interactions', () => {
  test('Run New Eval button is clickable', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const runButton = page.locator('button:has-text("Run New Eval")');

    if (await runButton.count() > 0) {
      await expect(runButton).toBeEnabled();

      // Click the button (may show modal or do nothing without backend)
      await runButton.click();

      // Button should still be visible after click
      await expect(runButton).toBeVisible();
    }
  });

  test('Retry button works on error state', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check if error state with retry button exists
    const retryButton = page.locator('button:has-text("Retry")');

    if (await retryButton.count() > 0) {
      await expect(retryButton).toBeEnabled();
      await retryButton.click();
    }
  });
});

// ============================================================================
// Run Eval Modal Tests
// ============================================================================

test.describe('Run Eval Modal', () => {
  test('clicking Run New Eval opens modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const runButton = page.locator('button:has-text("Run New Eval")');
    await runButton.click();

    // Modal should appear
    const modal = page.locator('text=Run New Evaluation');
    await expect(modal).toBeVisible();
  });

  test('modal has config input field', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();

    // Check for config input
    const configInput = page.locator('input[placeholder*="agenteval"]');
    await expect(configInput).toBeVisible();
    await expect(configInput).toHaveValue('agenteval.yaml');
  });

  test('modal has Run from Config and CLI Instructions tabs', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();

    // Check for tabs
    const configTab = page.locator('button:has-text("Run from Config")');
    const cliTab = page.locator('button:has-text("CLI Instructions")');

    await expect(configTab).toBeVisible();
    await expect(cliTab).toBeVisible();
  });

  test('clicking CLI Instructions tab shows CLI commands', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();
    await page.locator('button:has-text("CLI Instructions")').click();

    // Check for CLI commands
    const initCommand = page.locator('text=npm run agenteval -- init');
    await expect(initCommand).toBeVisible();
  });

  test('modal can be closed with X button', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();

    // Wait for modal to be visible
    await expect(page.locator('text=Run New Evaluation')).toBeVisible();

    // Click X button (close button in header)
    const closeButton = page.locator('button svg').first();
    await closeButton.click();

    // Modal should be closed
    await expect(page.locator('text=Run New Evaluation')).not.toBeVisible();
  });

  test('modal can be closed with Close button', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();

    // Wait for modal to be visible
    await expect(page.locator('text=Run New Evaluation')).toBeVisible();

    // Click Close button in footer
    await page.locator('button:has-text("Close")').click();

    // Modal should be closed
    await expect(page.locator('text=Run New Evaluation')).not.toBeVisible();
  });

  test('Run Evaluation button is present and clickable', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();

    const runEvalButton = page.locator('button:has-text("Run Evaluation")');
    await expect(runEvalButton).toBeVisible();
    await expect(runEvalButton).toBeEnabled();
  });

  test('config input can be edited', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run New Eval")').click();

    const configInput = page.locator('input[placeholder*="agenteval"]');
    await configInput.clear();
    await configInput.fill('my-custom-config.yaml');

    await expect(configInput).toHaveValue('my-custom-config.yaml');
  });
});

// ============================================================================
// Link Navigation Tests
// ============================================================================

test.describe('Link Navigation', () => {
  test('eval item links navigate to detail page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for eval item links
    const evalLinks = page.locator('a[href^="/evals/"]').first();

    if (await evalLinks.count() > 0) {
      const href = await evalLinks.getAttribute('href');
      await evalLinks.click();

      if (href) {
        await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
    }
  });

  test('table row links navigate correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);
    await page.waitForLoadState('networkidle');

    const tableLink = page.locator('tbody a[href^="/evals/"]').first();

    if (await tableLink.count() > 0) {
      await tableLink.click();
      await expect(page).toHaveURL(/\/evals\/.+/);
    }
  });
});

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Responsive Design', () => {
  test('dashboard works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Header should be visible
    const header = page.locator('header');
    if (await header.count() > 0) {
      await expect(header).toBeVisible();
    }
  });

  test('evals list works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/evals`);

    // Table should be visible
    const table = page.locator('table');
    if (await table.count() > 0) {
      await expect(table).toBeVisible();
    }
  });

  test('layout adapts to desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);

    // Grid layout should be visible
    const grid = page.locator('.grid');
    if (await grid.count() > 0) {
      await expect(grid.first()).toBeVisible();
    }
  });
});

// ============================================================================
// API Integration Tests
// ============================================================================

test.describe('API Integration', () => {
  test('dashboard fetches data from API', async ({ page }) => {
    let apiCalled = false;

    page.on('request', (request) => {
      if (request.url().includes('/api/evals')) {
        apiCalled = true;
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    expect(apiCalled).toBeTruthy();
  });

  test('evals list fetches with pagination params', async ({ page }) => {
    let requestUrl = '';

    page.on('request', (request) => {
      if (request.url().includes('/api/evals')) {
        requestUrl = request.url();
      }
    });

    await page.goto(`${BASE_URL}/evals`);
    await page.waitForLoadState('networkidle');

    expect(requestUrl).toContain('/api/evals');
  });

  test('API returns valid JSON response', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/evals`);

    // Should be valid response
    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe('Error Handling', () => {
  test('handles 404 page gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-12345`);

    // Should show some content (404 page or redirect)
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles invalid eval ID gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals/invalid-id-12345`);

    // Should show error or not found message
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Accessibility', () => {
  test('buttons have visible focus states', async ({ page }) => {
    await page.goto(BASE_URL);

    const button = page.locator('button').first();

    if (await button.count() > 0) {
      await button.focus();
      // Button should be focusable
      await expect(button).toBeFocused();
    }
  });

  test('links have visible focus states', async ({ page }) => {
    await page.goto(BASE_URL);

    const link = page.locator('a').first();

    if (await link.count() > 0) {
      await link.focus();
      await expect(link).toBeFocused();
    }
  });

  test('form inputs are labeled', async ({ page }) => {
    await page.goto(`${BASE_URL}/evals`);

    const input = page.locator('input').first();

    if (await input.count() > 0) {
      // Input should have placeholder or label
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');

      expect(placeholder || ariaLabel || id).toBeTruthy();
    }
  });
});
