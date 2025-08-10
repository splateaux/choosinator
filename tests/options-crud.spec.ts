import { faker } from "@faker-js/faker";
import { test, expect } from "@playwright/test";

test.describe("Options CRUD", () => {
  test("owners and editors can add/edit/delete options; viewers cannot", async ({
    page,
  }) => {
    const ownerEmail = `${faker.internet.userName()}@example.com`;
    const ownerPassword = faker.internet.password({ length: 12 });
    const editorEmail = `${faker.internet.userName()}@example.com`;
    const viewerEmail = `${faker.internet.userName()}@example.com`;
    const listName = `Options CRUD ${faker.word.noun()}`;

    // Owner signup and create list
    await page.goto("/join");
    await page.getByRole("textbox", { name: /email/i }).fill(ownerEmail);
    await page.getByLabel(/password/i).fill(ownerPassword);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("link", { name: "View Options Lists" }).click();
    await page.getByRole("link", { name: /new options list/i }).click();
    await page.getByLabel(/name/i).fill(listName);
    await page.getByTestId("new-options-list-save").click();
    await page.waitForURL(/\/optionsLists\/[^/]+$/);

    // Create editor + viewer users in background
    const createEditor = await page.request.post("/tests/create-user-only", {
      data: { email: editorEmail },
    });
    expect(createEditor.ok()).toBe(true);
    const createViewer = await page.request.post("/tests/create-user-only", {
      data: { email: viewerEmail },
    });
    expect(createViewer.ok()).toBe(true);

    // Share with editor (edit) and viewer (view)
    await page.getByLabel("Share with (email address)").fill(editorEmail);
    await page.getByRole("button", { name: "Share" }).click();
    await expect(
      page.getByText(`List shared with ${editorEmail}`),
    ).toBeVisible();

    await page.getByLabel("Share with (email address)").fill(viewerEmail);
    await page.getByLabel(/permission/i).selectOption("view");
    await page.getByRole("button", { name: "Share" }).click();
    await expect(
      page.getByText(`List shared with ${viewerEmail}`),
    ).toBeVisible();

    // Owner can add an option
    await page.getByLabel("Option name").fill("Alpha");
    await page.getByLabel("Option description").fill("First option");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Alpha")).toBeVisible();

    // Owner can edit and delete option
    await page.getByTestId("option-edit-toggle").first().click();
    const editNameInput = page
      .locator('details form input[name="name"]')
      .first();
    await editNameInput.fill("Beta");
    await page.getByTestId("option-edit-save").click();
    await expect(page.getByText("Beta")).toBeVisible();

    await page.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText("Beta")).not.toBeVisible();

    // Login as editor and verify can add
    await page.getByRole("button", { name: /log out/i }).click();
    await page.getByRole("link", { name: /log in/i }).click();
    await page.getByRole("textbox", { name: /email/i }).fill(editorEmail);
    await page.getByLabel(/password/i).fill("devpassword123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/optionsLists(\/)?$/);
    const editorSharedLink = page.getByRole("link", {
      name: new RegExp(listName),
    });
    await expect(editorSharedLink).toBeVisible();
    await editorSharedLink.click();

    await page.getByLabel("Option name").fill("Gamma");
    await page.getByRole("button", { name: /add option/i }).click();
    await expect(page.getByText("Gamma")).toBeVisible();

    // Login as viewer and verify cannot see add/delete controls
    await page.getByRole("button", { name: /log out/i }).click();
    await page.getByRole("link", { name: /log in/i }).click();
    await page.getByRole("textbox", { name: /email/i }).fill(viewerEmail);
    await page.getByLabel(/password/i).fill("devpassword123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/optionsLists(\/)?$/);
    const viewerSharedLink = page.getByRole("link", {
      name: new RegExp(listName),
    });
    await expect(viewerSharedLink).toBeVisible();
    await viewerSharedLink.click();

    await expect(page.getByTestId("permission-badge")).toHaveText(/view only/i);
    await expect(page.getByTestId("options-view-only")).toHaveText(
      /view only/i,
    );
    await expect(page.getByRole("button", { name: /add option/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
  });
});
