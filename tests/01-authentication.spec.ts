import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Authentication - Password Mode', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Set password auth mode
    await page.addInitScript(() => {
      window.localStorage.setItem('authMode', 'password');
    });
  });

  test('should display login page with orange/pink gradient', async ({ page }) => {
    await page.goto('/login');
    
    // Verify WELCOME text is visible
    await expect(page.getByText('WEL', { exact: false })).toBeVisible();
    await expect(page.getByText('COME', { exact: false })).toBeVisible();
    
    // Verify login form elements
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should register new user with password', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    const password = 'SecurePass123!';
    
    await page.goto('/login');
    
    // Click Register tab
    await page.getByRole('button', { name: /register/i }).click();
    
    // Fill registration form
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    
    // Submit registration
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should redirect to main page
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    
    // Verify logout button appears with username
    const logoutButton = page.getByRole('button', { name: /logout/i });
    await expect(logoutButton).toBeVisible();
  });

  test('should login existing user with password', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    const password = 'SecurePass123!';
    
    // First register
    await helpers.registerWithPassword(username, password);
    
    // Logout
    await helpers.logout();
    
    // Now login
    await helpers.loginWithPassword(username, password);
    
    // Verify we're on main page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="text"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid.*username.*password/i)).toBeVisible({ timeout: 3000 });
  });

  test('should enforce minimum password length', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await page.goto('/login');
    await page.getByRole('button', { name: /register/i }).click();
    
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', '12345'); // Only 5 characters
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should show error about password length
    await expect(page.getByText(/password.*at least.*6/i)).toBeVisible({ timeout: 3000 });
  });

  test('should logout successfully', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Verify we're logged in
    await expect(page).toHaveURL('/');
    
    // Logout
    await helpers.logout();
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should prevent duplicate username registration', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    const password = 'password123';
    
    // Register first time
    await helpers.registerWithPassword(username, password);
    await helpers.logout();
    
    // Try to register again with same username
    await page.goto('/login');
    await page.getByRole('button', { name: /register/i }).click();
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should show error about username already exists
    await expect(page.getByText(/username.*already.*exists|taken/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Authentication - Protected Routes', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access main page without authentication
    await page.goto('/');
    
    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated user from calendar to login', async ({ page }) => {
    // Try to access calendar without authentication
    await page.goto('/calendar');
    
    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('should allow authenticated user to access main page', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Should be on main page
    await expect(page).toHaveURL('/');
    
    // Should be able to see todo interface
    await expect(page.getByPlaceholder(/add.*todo/i)).toBeVisible();
  });

  test('should allow authenticated user to access calendar', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Navigate to calendar
    await helpers.goToCalendar();
    
    // Should be on calendar page
    await expect(page).toHaveURL('/calendar');
    
    // Should see calendar interface
    await expect(page.getByText(/sunday|monday|tuesday/i)).toBeVisible();
  });

  test('should redirect authenticated user away from login page', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Try to go back to login page
    await page.goto('/login');
    
    // Should redirect to main page
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('should maintain session across page reloads', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Reload the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });

  test('should clear session on logout', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    await helpers.logout();
    
    // Try to access main page after logout
    await page.goto('/');
    
    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Authentication - Session Management', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should persist session for 7 days', async ({ page, context }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Get cookies
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    
    // Check expiry is approximately 7 days (allow some variance)
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    const cookieExpiry = sessionCookie!.expires * 1000;
    const difference = Math.abs(cookieExpiry - sevenDaysFromNow);
    
    // Allow 1 minute variance
    expect(difference).toBeLessThan(60 * 1000);
  });

  test('should use HTTP-only cookies', async ({ page, context }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Get cookies
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    
    expect(sessionCookie?.httpOnly).toBe(true);
  });

  test('should return current user info from /api/auth/me', async ({ page, request }) => {
    const username = `testuser_${Date.now()}`;
    
    await helpers.registerWithPassword(username);
    
    // Call /api/auth/me endpoint
    const response = await page.request.get('/api/auth/me');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.username).toBe(username);
    expect(data.user.id).toBeDefined();
  });

  test('should return 401 from /api/auth/me when not authenticated', async ({ page }) => {
    // Don't login, just call the endpoint
    await page.goto('/login');
    
    const response = await page.request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });
});
