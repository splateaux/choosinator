import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("Smoke Test", () => {
  test("should verify core application functionality works end-to-end", async ({
    page,
  }) => {
    const testEmail = `${faker.internet.userName()}@example.com`;
    const testPassword = faker.internet.password({ length: 12 });
    const listName = `Smoke Test List ${faker.word.noun()}`;

    // Quick registration flow
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /create account/i }).click();

    // Verify successful registration and login
    await expect(page).toHaveURL("/");
    await expect(page.getByText(testEmail)).toBeVisible();

    // Quick list creation workflow
    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByRole("button", { name: /save/i }).click();

    // Verify list was created successfully
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("heading", { name: listName })).toBeVisible();

    // Verify basic sharing UI is present (owner permissions)
    await expect(page.getByText("Share List")).toBeVisible();
    await expect(page.getByLabel("Share with (email address)")).toBeVisible();

    // Quick logout/login cycle
    await page.getByRole("button", { name: /log out/i }).click();
    await page.waitForURL("", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();

    // Login and verify session persistence
    await page.getByRole("link", { name: /log in/i }).click();
    await page.getByRole("textbox", { name: /email/i }).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL("", { waitUntil: "networkidle" });

    // Verify list persistence and access (user should be on /optionsLists after login)
    await expect(page).toHaveURL(/\/optionsLists/);
    await expect(
      page.getByRole("link", { name: new RegExp(listName) }),
    ).toBeVisible();

    // Final verification - can access the list
    await page.getByRole("link", { name: new RegExp(listName) }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("heading", { name: listName })).toBeVisible();
  });
});
