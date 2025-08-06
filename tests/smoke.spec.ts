import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test.describe("smoke tests", () => {
  test("should allow you to register and login", async ({ page }) => {
    const loginForm = {
      email: `${faker.internet.userName()}@example.com`,
      password: faker.internet.password(),
    };

    await page.goto("/");
    await page.getByRole("link", { name: /sign up/i }).click();

    await page.getByRole("textbox", { name: /email/i }).fill(loginForm.email);
    await page.getByLabel(/password/i).fill(loginForm.password);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.getByRole("link", { name: /options lists/i }).click();
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  });
});
