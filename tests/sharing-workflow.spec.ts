import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("Sharing Workflow", () => {
    test("should complete full list sharing workflow between two users", async ({
        page,
    }) => {
        // Generate test data for both users
        const ownerEmail = `${faker.internet.userName()}@example.com`;
        const ownerPassword = faker.internet.password({ length: 12 });
        const sharedUserEmail = `${faker.internet.userName()}@example.com`;
        const listName = `Shared List ${faker.word.noun()}`;

        // Ensure emails are different
        expect(sharedUserEmail).not.toBe(ownerEmail);

        // === PHASE 1: Owner Registration & List Creation ===

        await page.goto("/join");
        await page.getByRole("textbox", { name: /email/i }).fill(ownerEmail);
        await page.getByLabel(/password/i).fill(ownerPassword);
        await page.getByRole("button", { name: /create account/i }).click();

        // Verify successful registration
        await expect(page).toHaveURL("/");
        await expect(page.getByText(ownerEmail)).toBeVisible();

        // Create a list to share
        await page.getByRole("link", { name: "View Options Lists" }).click();
        await page.getByRole("link", { name: /new options list/i }).click();
        await page.getByLabel(/name/i).fill(listName);
        await page.getByRole("button", { name: /save/i }).click();
        await page.waitForURL(/\/optionsLists\/[^/]+$/, {
            waitUntil: "networkidle",
        });

        // === PHASE 2: Create Second User (Background) ===

        // Create second user without logging in as them
        const createUserResponse = await page.request.post(
            "/tests/create-user-only",
            {
                data: { email: sharedUserEmail },
            },
        );
        expect(createUserResponse.ok()).toBe(true);

        // === PHASE 3: Sharing Validation & Success ===

        // Test sharing with non-existent user
        await page
            .getByLabel("Share with (email address)")
            .fill("nonexistent@example.com");
        await page.getByRole("button", { name: "Share" }).click();
        await expect(page.getByText("User not found")).toBeVisible();

        // Test sharing with yourself (should fail)
        await page.getByLabel("Share with (email address)").fill(ownerEmail);
        await page.getByRole("button", { name: "Share" }).click();
        await expect(
            page.getByText("You cannot share a list with yourself"),
        ).toBeVisible();
        await expect(
            page.getByText(`List shared with ${ownerEmail}`),
        ).not.toBeVisible();

        // Successfully share with second user
        await page.getByLabel("Share with (email address)").fill(sharedUserEmail);
        await page.getByRole("button", { name: "Share" }).click();
        await expect(
            page.getByText(`List shared with ${sharedUserEmail}`),
        ).toBeVisible();

        // Verify user appears in "Shared with:" section
        await expect(page.getByText("Shared with:")).toBeVisible();
        await expect(
            page.locator(".bg-gray-50").getByText(sharedUserEmail),
        ).toBeVisible();

        // === PHASE 4: Switch to Shared User ===

        // Logout from owner account
        await page.getByRole("button", { name: /log out/i }).click();
        await page.waitForURL("", { waitUntil: "networkidle" });

        // Login as shared user
        await page.getByRole("link", { name: /log in/i }).click();
        await page.getByRole("textbox", { name: /email/i }).fill(sharedUserEmail);
        await page.getByLabel(/password/i).fill("devpassword123");
        await page.getByRole("button", { name: /log in/i }).click();
        await page.waitForURL("", { waitUntil: "networkidle" });

        // Navigate to options lists (user should already be on /optionsLists after login)
        // But let's ensure we're on the right page
        await expect(page).toHaveURL(/\/optionsLists/);

        // Should see the shared list in "Shared with Me" section
        await expect(page.locator("text=Shared with Me")).toBeVisible();
        await expect(page.locator(`text=${listName}`)).toBeVisible();

        // Verify permission level is displayed (should show "Edit" by default)
        await expect(page.locator(`text=${listName}`).locator("xpath=..").getByText("Edit")).toBeVisible();

        // Click on shared list and verify sharing details
        await page.getByRole("link", { name: listName }).click();
        await page.waitForURL(/\/optionsLists\/[^/]+$/, {
            waitUntil: "networkidle",
        });
        await expect(page.getByRole("heading", { name: listName })).toBeVisible();
        await expect(
            page.locator(`text=Shared by email#${ownerEmail}`),
        ).toBeVisible();

        // Verify shared user doesn't see sharing controls (not the owner)
        await expect(page.getByText("Share List")).not.toBeVisible();

        // Verify shared user can see their permission level
        await expect(page.getByText("Can Edit")).toBeVisible();

        // === PHASE 5: Return to Owner & Verify ===

        // Logout from shared user
        await page.getByRole("button", { name: /log out/i }).click();
        await page.waitForURL("", { waitUntil: "networkidle" });

        // Login back as owner
        await page.getByRole("link", { name: /log in/i }).click();
        await page.getByRole("textbox", { name: /email/i }).fill(ownerEmail);
        await page.getByLabel(/password/i).fill(ownerPassword);
        await page.getByRole("button", { name: /log in/i }).click();
        await page.waitForURL("", { waitUntil: "networkidle" });

        // Verify owner still has access to their list (user should be on /optionsLists after login)
        await expect(page).toHaveURL(/\/optionsLists/);
        await expect(
            page.getByRole("link", { name: new RegExp(listName) }),
        ).toBeVisible();

        // Click into list and verify owner still has sharing controls
        await page.getByRole("link", { name: new RegExp(listName) }).click();
        await page.waitForURL(/\/optionsLists\/[^/]+$/, {
            waitUntil: "networkidle",
        });
        await expect(page.getByText("Share List")).toBeVisible();
        await expect(page.getByLabel("Share with (email address)")).toBeVisible();

        // Verify the sharing is still active (user still listed in shared section)
        await expect(page.getByText("Shared with:")).toBeVisible();
        await expect(
            page.locator(".bg-gray-50").getByText(sharedUserEmail),
        ).toBeVisible();

        // === PHASE 6: Test Permission Updates ===

        // Test changing permission from Edit to View
        // Find the permission dropdown specifically for the existing shared user using data-testid
        const permissionSelect = page.locator('[data-testid="existing-user-permission-select"]');
        await permissionSelect.selectOption("view");

        // Click Save to update permission using data-testid
        const saveButton = page.locator('[data-testid="existing-user-save-permission"]');
        await saveButton.click();

        // Wait for redirect and page reload
        await page.waitForURL(/\/optionsLists\/[^/]+$/, {
            waitUntil: "networkidle",
        });

        // Wait a bit more for the page to fully render
        await page.waitForTimeout(1000);

        // Debug: Check what's actually visible in the shared users section
        console.log("Debug: Checking shared users section...");
        const sharedUsersSection = page.locator(".bg-gray-50");
        await expect(sharedUsersSection).toBeVisible();

        // Debug: Log the text content
        const sharedUserText = await sharedUsersSection.textContent();
        console.log("Debug: Shared user section text:", sharedUserText);

        // Debug: Check if the permission dropdown shows the updated value
        const permissionSelectValue = await page.locator('[data-testid="existing-user-permission-select"]').inputValue();
        console.log("Debug: Permission select value:", permissionSelectValue);

        // Verify the permission display shows "View" (without spaces)
        await expect(page.locator(".bg-gray-50").getByText("(View)")).toBeVisible();

        // Test changing permission back to Edit
        await permissionSelect.selectOption("edit");
        await saveButton.click();

        // Wait for redirect and page reload
        await page.waitForURL(/\/optionsLists\/[^/]+$/, {
            waitUntil: "networkidle",
        });

        // Verify the permission display shows "Edit" (without spaces)
        await expect(page.locator(".bg-gray-50").getByText("(Edit)")).toBeVisible();
    });
});
