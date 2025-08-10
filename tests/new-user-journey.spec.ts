import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("New User Journey", () => {
    test("should complete full new user registration and list management workflow", async ({
        page,
    }) => {
        // Generate consistent test data
        const userEmail = `${faker.internet.userName()}@example.com`;
        const userPassword = faker.internet.password({ length: 12 });
        const listName = `My First List ${faker.word.noun()}`;

        // === PHASE 1: Registration with Validation ===

        await page.goto("/join");

        // Test password validation - too short
        await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
        await page.getByLabel(/password/i).fill("short");
        await page.getByRole("button", { name: /create account/i }).click();
        await expect(page.getByText("Password is too short")).toBeVisible();

        // Test password validation - empty
        await page.getByLabel(/password/i).fill("");
        await page.getByRole("button", { name: /create account/i }).click();
        await expect(page.getByText("Password is required")).toBeVisible();

        // Successful registration
        await page.getByLabel(/password/i).fill(userPassword);
        await page.getByRole("button", { name: /create account/i }).click();

        // Should be redirected and logged in
        await expect(page).toHaveURL("/");
        await expect(page.getByText(userEmail)).toBeVisible();

        // === PHASE 2: List Management ===

        // Navigate to options lists via homepage button
        await page.getByRole("link", { name: "View Options Lists" }).click();
        await expect(page).toHaveURL(/\/optionsLists/);

        // Verify sidebar sections are visible
        await expect(page.locator("text=My Lists")).toBeVisible();
        await expect(page.locator("text=Shared with Me")).toBeVisible();

        // Test list creation validation - empty name
        await page.getByRole("link", { name: /new options list/i }).click();
        await expect(page).toHaveURL(/\/optionsLists\/new/);
        await page.getByRole("button", { name: /save/i }).click();
        await expect(page.getByText("Name is required")).toBeVisible();

        // Create list successfully
        await page.getByLabel(/name/i).fill(listName);
        await page.getByRole("button", { name: /save/i }).click();

        // Should be redirected to the new list
        await page.waitForURL(/\/optionsLists\/[^/]+$/, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { name: listName })).toBeVisible();

        // Verify sharing UI is available for owner
        await expect(page.getByText("Share List")).toBeVisible();
        await expect(page.getByLabel("Share with (email address)")).toBeVisible();
        await expect(page.getByRole("button", { name: "Share" })).toBeVisible();

        // Go back to lists page and verify list appears
        await page.goto("/optionsLists");
        await expect(page.getByRole("link", { name: new RegExp(listName) })).toBeVisible();

        // === PHASE 3: Session Management ===

        // Test logout
        await page.getByRole("button", { name: /log out/i }).click();
        await page.waitForURL("", { waitUntil: "networkidle" });
        await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();

        // === PHASE 4: Login with Validation ===

        await page.getByRole("link", { name: /log in/i }).click();
        await expect(page).toHaveURL("/login");

        // Test login validation - non-existent user
        await page.getByRole("textbox", { name: /email/i }).fill("nonexistent@example.com");
        await page.getByLabel(/password/i).fill("somepassword123");
        await page.getByRole("button", { name: /log in/i }).click();
        await expect(page.getByText("Invalid email or password")).toBeVisible();

        // Test login validation - short password
        await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
        await page.getByLabel(/password/i).fill("short");
        await page.getByRole("button", { name: /log in/i }).click();
        await expect(page.getByText("Password is too short")).toBeVisible();

        // Test login validation - empty password
        await page.getByLabel(/password/i).fill("");
        await page.getByRole("button", { name: /log in/i }).click();
        await expect(page.getByText("Password is required")).toBeVisible();

        // Successful login
        await page.getByLabel(/password/i).fill(userPassword);
        await page.getByRole("button", { name: /log in/i }).click();
        await page.waitForURL("", { waitUntil: "networkidle" });
        await expect(page.getByText(userEmail)).toBeVisible();

        // === PHASE 5: Verify Session Persistence ===

        // Navigate back to lists and verify our list is still there
        await page.goto("/optionsLists");
        await expect(page.getByRole("link", { name: new RegExp(listName) })).toBeVisible();

        // Click into the list to verify full access
        await page.getByRole("link", { name: new RegExp(listName) }).click();
        await page.waitForURL(/\/optionsLists\/[^/]+$/, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { name: listName })).toBeVisible();

        // Verify we still have owner permissions (sharing section visible)
        await expect(page.getByText("Share List")).toBeVisible();
        await expect(page.getByLabel("Share with (email address)")).toBeVisible();
    });
});
