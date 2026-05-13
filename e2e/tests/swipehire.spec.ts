import { test, expect } from '@playwright/test';

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

async function signUpCandidate(page: any) {
  await page.goto('/signup');
  await page.fill('[name="firstName"]', 'E2E');
  await page.fill('[name="lastName"]', 'Candidate');
  await page.fill('[name="email"]', uniqueEmail());
  await page.fill('[name="password"]', 'StrongerPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/onboarding|swipe/);
}

test.describe('Authentication and route guards', () => {
  test('candidate can sign up and is not allowed into recruiter dashboard', async ({ page }) => {
    await signUpCandidate(page);
    await page.goto('/recruiter/dashboard');
    await expect(page).not.toHaveURL(/recruiter\/dashboard/);
  });

  test('invalid credentials show an error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid|login failed/i)).toBeVisible();
  });
});

test.describe('Candidate core flow', () => {
  test('signup to swipe page loads job cards and swipe controls', async ({ page }) => {
    await signUpCandidate(page);
    await page.goto('/swipe');
    await expect(page.getByText(/Discover Jobs|caught up/i)).toBeVisible();
    const rightButton = page.getByTestId('swipe-right');
    if (await rightButton.isVisible()) {
      await expect(page.getByTestId('job-card')).toBeVisible();
      await rightButton.click();
    }
  });

  test('matches, profile, subscription, and API tester pages render', async ({ page }) => {
    await signUpCandidate(page);
    for (const path of ['/matches', '/profile', '/subscription', '/api-tester']) {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
