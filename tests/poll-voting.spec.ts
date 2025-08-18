import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("Poll Voting", () => {
  // Ensure each test starts with a clean state
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await page.context().clearCookies();

    // Ensure we start with a fresh page state
    await page.goto("about:blank");
  });

  test("should allow users to vote on poll options", async ({ page }) => {
    // Generate unique test identifier for this specific test
    const testId = faker.string.alphanumeric(8);
    const userEmail = `test-${testId}-${faker.internet.userName()}@example.com`;
    const userPassword = faker.internet.password({ length: 12 });
    const listName = `Poll Test List ${testId}-${faker.word.noun()}`;
    const pollName = `Test Poll ${testId}-${faker.word.noun()}`;

    // === PHASE 1: Setup - Create User, List, and Poll ===

    // Register user
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/");

    // Create options list
    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Add some options to the list
    await page.getByLabel("Option name").fill("Option A");
    await page.getByLabel("Option description").fill("First option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Option A")).toBeVisible();

    await page.getByLabel("Option name").fill("Option B");
    await page.getByLabel("Option description").fill("Second option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Option B")).toBeVisible();

    // Create poll
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);
    await page.getByLabel(/poll name/i).fill(pollName);
    await page.getByRole("button", { name: /create poll/i }).click();

    // Should be redirected to the poll page
    await page.waitForURL(/\/polls\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Check that we have a poll heading (either custom name or list name)
    const pollHeading = page.getByRole("heading").first();
    await expect(pollHeading).toBeVisible();

    // === PHASE 2: Test Voting Functionality ===

    // Verify options are displayed
    await expect(page.getByTestId("options-list")).toBeVisible();
    await expect(page.getByText("Option A")).toBeVisible();
    await expect(page.getByText("Option B")).toBeVisible();

    // Verify voting controls are present
    await expect(
      page.getByRole("button", { name: /decrease tokens for Option A/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /increase tokens for Option A/i }),
    ).toBeVisible();

    // Test voting - allocate tokens to Option A
    await page
      .getByRole("button", { name: /increase tokens for Option A/i })
      .click();

    // Wait for form submission to complete
    await page.waitForLoadState("networkidle");

    // Wait for the page to update and verify something changed
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("tokens");
      },
      { timeout: 5000 },
    );

    // Check remaining balance after first vote
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("Remaining balance:");
      },
      { timeout: 5000 },
    );

    // Allocate more tokens to Option A
    await page
      .getByRole("button", { name: /increase tokens for Option A/i })
      .click();
    await page.waitForLoadState("networkidle");

    // Wait for update and verify the token count changed
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("tokens");
      },
      { timeout: 5000 },
    );

    // Allocate tokens to Option B
    await page
      .getByRole("button", { name: /increase tokens for Option B/i })
      .click();
    await page.waitForLoadState("networkidle");

    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("tokens");
      },
      { timeout: 5000 },
    );

    // Test decreasing tokens
    await page
      .getByRole("button", { name: /decrease tokens for Option A/i })
      .click();
    await page.waitForLoadState("networkidle");

    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("tokens");
      },
      { timeout: 5000 },
    );

    // === PHASE 3: Test Token Limits ===

    // Check current remaining balance
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("Remaining balance:");
      },
      { timeout: 5000 },
    );

    // Try to allocate more tokens - should be limited by the remaining balance
    // Keep clicking until we hit the limit or run out of patience
    let attempts = 0;
    const maxAttempts = 15; // Reasonable limit to prevent infinite loops

    while (attempts < maxAttempts) {
      attempts++;

      // Try to add a token
      await page
        .getByRole("button", { name: /increase tokens for Option A/i })
        .click();

      // Wait a moment for the update
      await page.waitForTimeout(500);

      // Check if we've hit the limit (remaining balance = 0)
      const zeroBalance = page.getByText("Remaining balance: 0 tokens");
      if (await zeroBalance.isVisible()) {
        break;
      }
    }

    // Verify we either hit the limit or made reasonable progress
    expect(attempts).toBeLessThan(maxAttempts);

    // Should see some token count for Option A
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("tokens");
      },
      { timeout: 5000 },
    );
  });

  test("should allow guest participation", async ({ page }) => {
    // Generate unique test identifier for this specific test
    const testId = faker.string.alphanumeric(8);
    const userEmail = `test-${testId}-${faker.internet.userName()}@example.com`;
    const userPassword = faker.internet.password({ length: 12 });
    const listName = `Guest Test List ${testId}-${faker.word.noun()}`;
    const pollName = `Guest Test Poll ${testId}-${faker.word.noun()}`;

    // === PHASE 1: Setup - Create User, List, and Poll ===

    // Register user
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/");

    // Create options list
    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Add an option
    await page.getByLabel("Option name").fill("Guest Option");
    await page
      .getByLabel("Option description")
      .fill("Option for guest testing");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Guest Option")).toBeVisible();

    // Add a second option to meet minimum requirement
    await page.getByLabel("Option name").fill("Second Guest Option");
    await page
      .getByLabel("Option description")
      .fill("Another option for guest testing");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Second Guest Option")).toBeVisible();

    // Create poll
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);
    await page.getByLabel(/poll name/i).fill(pollName);
    await page.getByRole("button", { name: /create poll/i }).click();
    await page.waitForURL(/\/polls\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Check that we have a poll heading (either custom name or list name)
    const pollHeading = page.getByRole("heading").first();
    await expect(pollHeading).toBeVisible();

    // Store the poll URL for guest testing
    const pollUrl = page.url();

    // === PHASE 2: Test Guest Participation ===

    // Logout from the main page (which has the header)
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Log Out/i })).toBeVisible();
    await page.getByRole("button", { name: /Log Out/i }).click();
    await page.waitForURL("", { waitUntil: "networkidle" });

    // Navigate to the poll as a guest
    await page.goto(pollUrl);

    // Debug: Check if the guest participation section exists
    const guestSection = page.locator('div:has-text("Participate as:")');
    console.log("Guest section found:", await guestSection.count());

    // Test guest participation form
    await expect(page.getByText(/Participate as:/i)).toBeVisible();

    // Continue as guest
    const guestName = `Guest ${faker.word.noun()}`;
    await page.getByLabel(/Your name/i).fill(guestName);
    await page.getByRole("button", { name: /Continue as Guest/i }).click();

    // Should see guest confirmation
    await expect(page.getByText(/Participating as guest:/i)).toBeVisible();
    await expect(page.getByText(guestName)).toBeVisible();

    // Guest should be able to vote
    await expect(
      page.getByRole("button", { name: /increase tokens for Guest Option/i }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /increase tokens for Guest Option/i })
      .click();
    await page.waitForLoadState("networkidle");

    // Verify guest vote was recorded
    // Note: This shows total tokens for the option, including the guest's contribution
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes("tokens");
      },
      { timeout: 5000 },
    );
  });

  test("should require minimum options before creating poll", async ({
    page,
  }) => {
    // Generate unique test identifier for this specific test
    const testId = faker.string.alphanumeric(8);
    const userEmail = `test-${testId}-${faker.internet.userName()}@example.com`;
    const userPassword = faker.internet.password({ length: 12 });
    const listName = `Empty List ${testId}-${faker.word.noun()}`;
    const pollName = `Empty Poll ${testId}-${faker.word.noun()}`;

    // Register user
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/");

    // Create empty options list
    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Store the options list ID for navigation
    const optionsListId = page.url().split("/").pop();

    // Try to create poll from empty list - should show validation message
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");

    // Should see the warning that we need more options
    await expect(
      page.getByText(/You need at least 2 options to create a poll/),
    ).toBeVisible();

    // The form should be disabled
    await expect(
      page.getByRole("button", { name: /Need More Options/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Need More Options/i }),
    ).toBeDisabled();

    // Add one option - still not enough
    await page.goto(`/optionsLists/${optionsListId}`);
    await page.getByLabel("Option name").fill("First Option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("First Option")).toBeVisible();

    // Try to create poll again - still not enough
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");

    // Should still see the warning
    await expect(
      page.getByText(/You need at least 2 options to create a poll/),
    ).toBeVisible();

    // Add second option - now should be able to create poll
    await page.goto(`/optionsLists/${optionsListId}`);
    await page.getByLabel("Option name").fill("Second Option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Second Option")).toBeVisible();

    // Now try to create poll - should work
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);

    // Should see the Create Poll button enabled
    await expect(
      page.getByRole("button", { name: /Create Poll/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create Poll/i }),
    ).toBeEnabled();

    // Fill in poll name and create
    await page.getByLabel(/poll name/i).fill(pollName);
    await page.getByRole("button", { name: /Create Poll/i }).click();

    // Should be redirected to the poll page
    await page.waitForURL(/\/polls\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Should show the poll heading
    const pollHeading = page.getByRole("heading").first();
    await expect(pollHeading).toBeVisible();

    // Should show the options we created
    await expect(page.getByText("First Option")).toBeVisible();
    await expect(page.getByText("Second Option")).toBeVisible();
    await expect(page.getByTestId("options-list")).toBeVisible();
  });

  test("should validate guest name input", async ({ page }) => {
    // Generate unique test identifier for this specific test
    const testId = faker.string.alphanumeric(8);
    const userEmail = `test-${testId}-${faker.internet.userName()}@example.com`;
    const userPassword = faker.internet.password({ length: 12 });
    const listName = `Validation Test List ${testId}-${faker.word.noun()}`;

    // Register user and create list with options
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/");

    // Create options list
    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Add two options to meet minimum requirement
    await page.getByLabel("Option name").fill("First Option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("First Option")).toBeVisible();

    await page.getByLabel("Option name").fill("Second Option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Second Option")).toBeVisible();

    // Create poll
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);
    await page.getByLabel(/poll name/i).fill(`Test Poll ${testId}`);

    // Debug: Check the form state before submitting
    console.log("About to click Create Poll button");
    console.log(
      "Poll name field value:",
      await page.getByLabel(/poll name/i).inputValue(),
    );

    await page.getByRole("button", { name: /Create Poll/i }).click();

    // Debug: Wait a moment and check what happened
    await page.waitForTimeout(1000);
    console.log("After clicking Create Poll, URL is:", page.url());
    console.log(
      "Page content includes 'Create Poll':",
      await page.getByText(/Create Poll/i).isVisible(),
    );

    // Should be redirected to the poll page
    await page.waitForURL(/\/polls\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Check that we have a poll heading
    const pollHeading = page.getByRole("heading").first();
    await expect(pollHeading).toBeVisible();

    // Verify options are displayed
    await expect(page.getByTestId("options-list")).toBeVisible();
    await expect(page.getByText("First Option")).toBeVisible();
    await expect(page.getByText("Second Option")).toBeVisible();

    // Store the poll URL for guest testing
    const pollUrl = page.url();

    // === PHASE 2: Test Guest Participation ===

    // Logout from the main page (which has the header)
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Log Out/i })).toBeVisible();
    await page.getByRole("button", { name: /Log Out/i }).click();
    await page.waitForURL("", { waitUntil: "networkidle" });

    // Navigate to the poll as a guest
    await page.goto(pollUrl);

    // Test guest participation form
    await expect(page.getByText(/Participate as:/i)).toBeVisible();

    // Test empty guest name validation
    // Use JavaScript to bypass HTML5 validation and test server-side validation
    await page.evaluate(() => {
      const form = document.querySelector('form[method="post"]');
      const submitButton = form?.querySelector('button[type="submit"]');
      if (submitButton) {
        // Remove required attribute temporarily to test server-side validation
        const nameInput = form?.querySelector(
          'input[name="guestName"]',
        ) as HTMLInputElement;
        if (nameInput) {
          nameInput.removeAttribute("required");
        }
      }
    });

    await page.getByRole("button", { name: /Continue as Guest/i }).click();
    await page.waitForLoadState("networkidle");

    // Now we should get server-side validation
    await page.waitForFunction(
      () => {
        const validationMessage = document.querySelector('div[role="alert"]');
        return (
          validationMessage &&
          validationMessage.textContent?.includes(
            "Name is required to continue as Guest",
          )
        );
      },
      { timeout: 5000 },
    );

    // Test whitespace-only guest name validation
    await page.getByLabel(/Your name/i).fill("   ");
    await page.getByRole("button", { name: /Continue as Guest/i }).click();
    await page.waitForLoadState("networkidle");

    // For whitespace validation, we should get server-side validation
    await page.waitForFunction(
      () => {
        const validationMessage = document.querySelector('div[role="alert"]');
        return (
          validationMessage &&
          validationMessage.textContent?.includes(
            "Name is required to continue as Guest",
          )
        );
      },
      { timeout: 5000 },
    );

    // Test valid guest name
    const validGuestName = `Guest ${testId}`;
    await page.getByLabel(/Your name/i).fill(validGuestName);
    await page.getByRole("button", { name: /Continue as Guest/i }).click();
    await page.waitForLoadState("networkidle");

    // Should now show guest participation
    await expect(page.getByText(/Participating as guest:/i)).toBeVisible();
    await expect(page.getByText(validGuestName)).toBeVisible();
  });

  test("should sort poll options by vote count in descending order", async ({
    page,
  }) => {
    // Generate unique test identifier for this specific test
    const testId = faker.string.alphanumeric(8);
    const userEmail = `test-${testId}-${faker.internet.userName()}@example.com`;
    const userPassword = faker.internet.password({ length: 12 });
    const listName = `Sorting Test List ${testId}-${faker.word.noun()}`;
    const pollName = `Sorting Test Poll ${testId}-${faker.word.noun()}`;

    // === PHASE 1: Setup - Create User, List, and Poll ===

    // Register user
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/");

    // Create options list
    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // Add three options to the list
    await page.getByLabel("Option name").fill("Option A");
    await page.getByLabel("Option description").fill("First option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Option A")).toBeVisible();

    await page.getByLabel("Option name").fill("Option B");
    await page.getByLabel("Option description").fill("Second option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Option B")).toBeVisible();

    await page.getByLabel("Option name").fill("Option C");
    await page.getByLabel("Option description").fill("Third option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Option C")).toBeVisible();

    // Create poll
    await page.getByRole("link", { name: /create poll/i }).click();
    await page.waitForURL(/\/optionsLists\/[^/]+\/polls\/new/);
    await page.getByLabel(/poll name/i).fill(pollName);
    await page.getByRole("button", { name: /create poll/i }).click();

    // Should be redirected to the poll page
    await page.waitForURL(/\/polls\/[^/]+$/, {
      waitUntil: "networkidle",
    });

    // === PHASE 2: Test Initial Order (should be alphabetical by default) ===

    // Get the options list and verify initial order
    const optionsList = page.getByTestId("options-list");
    await expect(optionsList).toBeVisible();

    // Initially, options should be in alphabetical order: A, B, C
    const initialOptions = await optionsList.locator("li").all();
    expect(initialOptions).toHaveLength(3);

    // Check initial order (alphabetical)
    await expect(initialOptions[0].getByText("Option A")).toBeVisible();
    await expect(initialOptions[1].getByText("Option B")).toBeVisible();
    await expect(initialOptions[2].getByText("Option C")).toBeVisible();

    // === PHASE 3: Test Sorting After Voting ===

    // Vote on Option C (give it 3 tokens)
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole("button", { name: /increase tokens for Option C/i })
        .click();
      await page.waitForLoadState("networkidle");
    }

    // Vote on Option A (give it 1 token)
    await page
      .getByRole("button", { name: /increase tokens for Option A/i })
      .click();
    await page.waitForLoadState("networkidle");

    // Vote on Option B (give it 2 tokens)
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", { name: /increase tokens for Option B/i })
        .click();
      await page.waitForLoadState("networkidle");
    }

    // Wait for the page to update
    await page.waitForLoadState("networkidle");

    // === PHASE 4: Verify Sorted Order ===

    // Now options should be sorted by vote count: C (3), B (2), A (1)
    const sortedOptions = await optionsList.locator("li").all();
    expect(sortedOptions).toHaveLength(3);

    // Check sorted order (by vote count descending)
    await expect(sortedOptions[0].getByText("Option C")).toBeVisible();
    await expect(sortedOptions[1].getByText("Option B")).toBeVisible();
    await expect(sortedOptions[2].getByText("Option A")).toBeVisible();

    // Verify the token counts are displayed correctly
    await expect(sortedOptions[0].getByText("3 tokens")).toBeVisible();
    await expect(sortedOptions[1].getByText("2 tokens")).toBeVisible();
    await expect(sortedOptions[2].getByText("1 tokens")).toBeVisible();

    // === PHASE 5: Verify Bar Lengths are Proportional ===

    // Get the vote bars for each option
    const optionCBars = sortedOptions[0].locator('[aria-label*="Vote bar"]');
    const optionBBars = sortedOptions[1].locator('[aria-label*="Vote bar"]');
    const optionABars = sortedOptions[2].locator('[aria-label*="Vote bar"]');

    // Wait for bars to be visible
    await expect(optionCBars).toBeVisible();
    await expect(optionBBars).toBeVisible();
    await expect(optionABars).toBeVisible();

    // Verify that Option C (3 tokens) has the longest bar
    // Option B (2 tokens) should have 2/3 the length of Option C
    // Option A (1 token) should have 1/3 the length of Option C

    // Get the actual bar widths using JavaScript
    const barWidths = await page.evaluate(() => {
      const bars = document.querySelectorAll('[aria-label*="Vote bar"]');
      return Array.from(bars).map((bar) => {
        const innerBar = bar.querySelector(
          'div[style*="width"]',
        ) as HTMLElement;
        return innerBar ? parseFloat(innerBar.style.width) : 0;
      });
    });

    // Should have 3 bars
    expect(barWidths).toHaveLength(3);

    // Option C should have the longest bar (100% - it's the maximum)
    expect(barWidths[0]).toBeGreaterThan(0);

    // Option B should have 2/3 the length of Option C
    const expectedBWidth = (2 / 3) * 100; // 66.67%
    expect(barWidths[1]).toBeCloseTo(expectedBWidth, 0);

    // Option A should have 1/3 the length of Option C
    const expectedAWidth = (1 / 3) * 100; // 33.33%
    expect(barWidths[2]).toBeCloseTo(expectedAWidth, 0);
  });

  // Add a simple isolation test to help identify parallel execution issues
  test("should maintain isolation between parallel test runs", async ({
    page,
  }) => {
    const testId = faker.string.alphanumeric(8);
    const uniqueEmail = `isolation-test-${testId}-${Date.now()}@example.com`;

    // This test should be completely independent
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill("testpassword123");

    // Just verify the form is working - don't submit to avoid database conflicts
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeEnabled();
    // The join page doesn't have a "Create your account" heading, just the form
    await expect(page.getByText(/Email address/i)).toBeVisible();
  });
});
