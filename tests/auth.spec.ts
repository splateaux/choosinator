import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Authentication', () => {
    test.describe('User Registration', () => {
        test('should register a new user successfully', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;
            const password = faker.internet.password({ length: 10 });

            await page.goto('/join');

            await page.getByRole('textbox', { name: /email/i }).fill(email);
            await page.getByLabel(/password/i).fill(password);
            await page.getByRole('button', { name: /create account/i }).click();

            // Should be redirected and logged in
            await expect(page).toHaveURL('/');
            await expect(page.getByText(email)).toBeVisible();
        });

        test('should show error for short password', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;

            await page.goto('/join');

            await page.getByRole('textbox', { name: /email/i }).fill(email);
            await page.getByLabel(/password/i).fill('short');
            await page.getByRole('button', { name: /create account/i }).click();

            await expect(page.getByText('Password is too short')).toBeVisible();
        });

        test('should show error for empty password', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;

            await page.goto('/join');

            await page.getByRole('textbox', { name: /email/i }).fill(email);
            await page.getByRole('button', { name: /create account/i }).click();

            await expect(page.getByText('Password is required')).toBeVisible();
        });
    });

    test.describe('User Login', () => {
        test('should show error for non-existent user', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;

            await page.goto('/login');

            await page.getByRole('textbox', { name: /email/i }).fill(email);
            await page.getByLabel(/password/i).fill('somepassword123');
            await page.getByRole('button', { name: /log in/i }).click();

            await expect(page.getByText('Invalid email or password')).toBeVisible();
        });

        test('should show error for short password', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;

            await page.goto('/login');

            await page.getByRole('textbox', { name: /email/i }).fill(email);
            await page.getByLabel(/password/i).fill('short');
            await page.getByRole('button', { name: /log in/i }).click();

            await expect(page.getByText('Password is too short')).toBeVisible();
        });

        test('should show error for empty password', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;

            await page.goto('/login');

            await page.getByRole('textbox', { name: /email/i }).fill(email);
            await page.getByRole('button', { name: /log in/i }).click();

            await expect(page.getByText('Password is required')).toBeVisible();
        });
    });

    test.describe('Logout', () => {
        test('should logout successfully', async ({ page }) => {
            const email = `${faker.internet.userName()}@example.com`;

            // Create user and login
            await page.request.post('/__tests/create-user', { data: { email } });
            await page.goto('/');

            await page.getByRole('button', { name: /log out/i }).click();

            await expect(page).toHaveURL('/');
            await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
            await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
        });
    });
}); 