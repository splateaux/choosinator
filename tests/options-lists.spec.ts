import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("Options Lists", () => {
  test.beforeEach(async ({ page }) => {
    // Create a user and login before each test
    // Each test gets a fresh user for isolation
    const email = `${faker.internet.userName()}@example.com`;
    await page.request.post("/tests/create-user", { data: { email } });
    await page.goto("/");

    // Note: If you want to see data between tests, you could use a shared email:
    // const email = 'shared-test-user@example.com';
  });

  test.describe("Creating Options Lists", () => {
    test("should create a new options list successfully", async ({ page }) => {
      const listName = `Test List ${faker.word.noun()}`;

      await page.goto("/optionsLists");
      await page.getByRole("link", { name: /new options list/i }).click();

      await page.getByLabel(/name/i).fill(listName);
      await page.getByRole("button", { name: /save/i }).click();

      // Should be redirected to the new list
      await expect(page).toHaveURL(/\/optionsLists\//);
      await expect(page.getByRole("heading", { name: listName })).toBeVisible();
    });

    test("should show error for empty name", async ({ page }) => {
      await page.goto("/optionsLists/new");

      await page.getByRole("button", { name: /save/i }).click();

      await expect(page.getByText("Name is required")).toBeVisible();
    });

    test("should show the new list in the options lists page", async ({
      page,
    }) => {
      const listName = `Test List ${faker.word.noun()}`;

      // Create the list
      await page.goto("/optionsLists/new");
      await page.getByLabel(/name/i).fill(listName);
      await page.getByRole("button", { name: /save/i }).click();

      // Should see the list
      await expect(
        page.getByRole("link", { name: new RegExp(listName) }),
      ).toBeVisible();
    });
  });
});
