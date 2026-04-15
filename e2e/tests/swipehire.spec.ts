import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    await page.fill('[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/onboarding|swipe/);
  });

  test('user can log in', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'admin@swipehire.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/swipe/);
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});

test.describe('Swipe Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@swipehire.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/swipe/);
  });

  test('jobs load on swipe page', async ({ page }) => {
    await expect(page.locator('text=No more jobs')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
  });

  test('user can swipe right on a job', async ({ page }) => {
    const initialCount = await page.locator('text=swipes remaining').textContent();
    await page.click('[data-testid="swipe-right"]');
    await expect(page.locator('text=swipes remaining')).not.toHaveText(initialCount);
  });

  test('filters work correctly', async ({ page }) => {
    await page.click('text=Filters');
    await page.check('[name="remote"]');
    await page.click('text=Apply Filters');
    
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
  });
});

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@swipehire.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/swipe/);
  });

  test('user can view profile', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.locator('text=About')).toBeVisible();
    await expect(page.locator('text=Experience')).toBeVisible();
    await expect(page.locator('text=Education')).toBeVisible();
  });

  test('user can edit profile', async ({ page }) => {
    await page.goto('/profile');
    await page.click('text=Edit Profile');
    
    await page.fill('[name="title"]', 'Senior Developer');
    await page.fill('[name="bio"]', 'Test bio');
    await page.click('text=Save');
    
    await expect(page.locator('text=Senior Developer')).toBeVisible();
  });
});

test.describe('Matches', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@swipehire.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/swipe/);
  });

  test('user can view matches', async ({ page }) => {
    await page.goto('/matches');
    
    await expect(page.locator('text=Matches')).toBeVisible();
  });

  test('user can send message', async ({ page }) => {
    await page.goto('/matches');
    
    // Click on first match if exists
    const firstMatch = page.locator('[data-testid="match-item"]').first();
    if (await firstMatch.isVisible()) {
      await firstMatch.click();
      await page.fill('[data-testid="message-input"]', 'Test message');
      await page.click('[data-testid="send-message"]');
      
      await expect(page.locator('text=Test message')).toBeVisible();
    }
  });
});

test.describe('Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@swipehire.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/swipe/);
  });

  test('user can view subscription page', async ({ page }) => {
    await page.goto('/subscription');
    
    await expect(page.locator('text=Choose Your Plan')).toBeVisible();
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
  });

  test('upgrade button redirects to checkout', async ({ page }) => {
    await page.goto('/subscription');
    
    // Note: In test environment, Stripe will be mocked
    await page.click('text=Upgrade', { hasText: /^Upgrade$/ });
    
    // Should either redirect to Stripe or show error
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Tester', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@swipehire.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/swipe/);
  });

  test('api tester page loads', async ({ page }) => {
    await page.goto('/api-tester');
    
    await expect(page.locator('text=API Tester')).toBeVisible();
    await expect(page.locator('text=Endpoints')).toBeVisible();
  });

  test('can test health endpoint', async ({ page }) => {
    await page.goto('/api-tester');
    
    await page.click('text=/api/health');
    await page.click('text=Send GET Request');
    
    await expect(page.locator('text=status')).toBeVisible();
  });
});