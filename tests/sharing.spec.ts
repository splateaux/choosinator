import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("List Sharing", () => {
    let currentEmail: string;
    test.beforeEach(async ({ page }) => {
        currentEmail = `${faker.internet.userName()}@example.com`;
        await page.request.post("/tests/create-user", { data: { email: currentEmail } });
        await page.goto("/");
    });
    test("should allow users to share lists with other users", async ({ page }) => {
        // Navigate to the options lists page
        await page.goto("/optionsLists");

        // Create a new list
        await page.getByRole("link", { name: "+ New Options List" }).click();
        await page.getByLabel("Name:").fill("My Shared List");
        await page.getByRole("button", { name: "Save" }).click();

        // Wait for the list to be created and navigate to it
        await page.waitForURL(/\/optionsLists\/[^/]+$/);

        // Check that the sharing section is visible for the owner
        await expect(page.locator("text=Share List")).toBeVisible();

        // Try to share with a non-existent user
        await page.fill('input[name="email"]', "nonexistent@example.com");
        await page.click('button:has-text("Share")');

        // Should show an error
        await expect(page.locator("text=User not found")).toBeVisible();

        // Try to share with yourself (use the logged-in user's email)
        await page.fill('input[name="email"]', currentEmail);
        await page.click('button:has-text("Share")');

        // Should show an error about sharing with yourself
        await expect(page.locator("text=You cannot share a list with yourself")).toBeVisible();
    });

    test("should show shared lists in the sidebar", async ({ page }) => {
        // Ensure at least one list exists so the sidebar renders headings
        await page.goto("/optionsLists/new");
        await page.getByLabel("Name:").fill("Sidebar Check List");
        await page.getByRole("button", { name: "Save" }).click();

        // Navigate to the options lists page
        await page.goto("/optionsLists");

        // Check that the sidebar shows both "My Lists" and "Shared with Me" sections
        await expect(page.locator("text=My Lists")).toBeVisible();
        await expect(page.locator("text=Shared with Me")).toBeVisible();
    });

    test("should show sharing indicator for shared lists", async ({ page }) => {
        // Navigate to the options lists page
        await page.goto("/optionsLists");

        // Create a new list
        await page.getByRole("link", { name: "+ New Options List" }).click();
        await page.getByLabel("Name:").fill("Test List for Sharing");
        await page.getByRole("button", { name: "Save" }).click();

        // Wait for the list to be created and navigate to it
        await page.waitForURL(/\/optionsLists\/[^/]+$/);

        // Check that the sharing section is visible
        await expect(page.locator("text=Share with (email address)")).toBeVisible();

        // Check that the share button is present
        await expect(page.locator('button:has-text("Share")')).toBeVisible();
    });
}); 