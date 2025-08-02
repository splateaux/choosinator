import { faker } from "@faker-js/faker";

describe("Options Lists", () => {
    beforeEach(() => {
        // Create a user and login before each test
        const email = `${faker.internet.userName()}@example.com`;
        cy.login({ email });
        cy.then(() => ({ email })).as("currentUser");
    });

    describe("Creating Options Lists", () => {
        it("should create a new options list successfully", () => {
            const listName = `Test List ${faker.word.noun()}`;

            cy.visitAndCheck("/optionsLists");
            cy.findByRole("link", { name: /new options list/i }).click();

            cy.findByLabelText(/name/i).type(listName);
            cy.findByRole("button", { name: /save/i }).click();

            // Should be redirected to the new list
            cy.url({ timeout: 10000 }).should("include", "/optionsLists/");
            cy.contains(listName);
        });

        it("should show error for empty name", () => {
            cy.visitAndCheck("/optionsLists/new");

            cy.findByRole("button", { name: /save/i }).click();

            cy.contains("Name is required");
        });

        it("should show the new list in the options lists page", () => {
            const listName = `Test List ${faker.word.noun()}`;

            // Create the list
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(listName);
            cy.findByRole("button", { name: /save/i }).click();

            // Go back to options lists page
            cy.visit("/optionsLists");

            // Should see the list
            cy.contains(listName);
            cy.get(`a[href*="/optionsLists/"]`).contains(listName);
        });
    });

    describe("Viewing Options Lists", () => {
        it("should display 'No Options Lists yet' when user has no lists", () => {
            cy.visitAndCheck("/optionsLists");

            cy.contains("No Options Lists yet");
        });

        it("should display options list details when clicked", () => {
            const listName = `Test List ${faker.word.noun()}`;

            // Create a list first
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(listName);
            cy.findByRole("button", { name: /save/i }).click();

            // Navigate back to lists and click on it
            cy.visit("/optionsLists");
            cy.get(`a[href*="/optionsLists/"]`).contains(listName).click();

            // Wait for navigation and content to load
            cy.url({ timeout: 10000 }).should("include", "/optionsLists/");

            // Should show the list details with increased timeout for CI
            cy.contains(listName, { timeout: 10000 });
            cy.get("h3", { timeout: 10000 }).should("contain", listName);
        });

        it("should show 404 error for non-existent options list", () => {
            cy.visit("/optionsLists/non-existent-id", { failOnStatusCode: false });

            cy.contains("Options List not found");
        });
    });

    describe("Options Lists Privacy", () => {
        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should not allow access to another user's options list", () => {
            const user1Email = `user1_${faker.internet.userName()}@example.com`;
            const user2Email = `user2_${faker.internet.userName()}@example.com`;
            const listName = `Private List ${faker.word.noun()}`;
            let optionsListId: string;

            // User 1 creates a list
            cy.login({ email: user1Email });
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(listName);
            cy.findByRole("button", { name: /save/i }).click();

            // Extract the options list ID from URL
            cy.url().then((url) => {
                optionsListId = url.split("/optionsLists/")[1];

                // Logout user 1
                cy.findByRole("button", { name: /log out/i }).click();

                // Login as user 2
                cy.login({ email: user2Email });

                // Try to access user 1's list directly
                cy.visit(`/optionsLists/${optionsListId}`, { failOnStatusCode: false });
                // Should show not found error page
                cy.contains("Options List not found");
            });
        });

        it("should only show user's own options lists", () => {
            const user1Email = `user1_${faker.internet.userName()}@example.com`;
            const user2Email = `user2_${faker.internet.userName()}@example.com`;
            const user1ListName = `User 1 List ${faker.word.noun()}`;
            const user2ListName = `User 2 List ${faker.word.noun()}`;

            // User 1 creates a list
            cy.login({ email: user1Email });
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(user1ListName);
            cy.findByRole("button", { name: /save/i }).click();
            cy.findByRole("button", { name: /log out/i }).click();

            // User 2 creates a list
            cy.login({ email: user2Email });
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(user2ListName);
            cy.findByRole("button", { name: /save/i }).click();

            // User 2 should only see their own list
            cy.visit("/optionsLists");
            cy.contains(user2ListName);
            cy.get("body").should("not.contain", user1ListName);
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should require authentication to access options lists", () => {
            // Logout first to ensure we're not logged in (if a user exists)
            cy.visitAndCheck("/");
            cy.get('body').then(($body) => {
                if ($body.find('button:contains("Log out")').length > 0) {
                    cy.findByRole("button", { name: /log out/i }).click();
                    cy.url().should("eq", Cypress.config().baseUrl + "/");
                }
            });

            // Visit options lists without being logged in
            cy.visit("/optionsLists", { failOnStatusCode: false });

            // Should be redirected to login
            cy.url().should("include", "/login");
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should require authentication to create new options lists", () => {
            // Logout first to ensure we're not logged in (if a user exists)
            cy.visitAndCheck("/");
            cy.get('body').then(($body) => {
                if ($body.find('button:contains("Log out")').length > 0) {
                    cy.findByRole("button", { name: /log out/i }).click();
                    cy.url().should("eq", Cypress.config().baseUrl + "/");
                }
            });

            // Visit new options list page without being logged in
            cy.visit("/optionsLists/new", { failOnStatusCode: false });

            // Should be redirected to login
            cy.url().should("include", "/login");
        });
    });

    describe("Options Lists Navigation", () => {
        it("should highlight active options list in sidebar", () => {
            const listName = `Test List ${faker.word.noun()}`;

            // Create a list
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(listName);
            cy.findByRole("button", { name: /save/i }).click();

            // Go back to options lists page and click on the list
            cy.visit("/optionsLists");
            cy.get(`a[href*="/optionsLists/"]`).contains(listName).click();

            // Wait for navigation to complete
            cy.url({ timeout: 10000 }).should("include", "/optionsLists/");

            // The active list should have the active styling with increased timeout
            cy.get(`a[href*="/optionsLists/"]`, { timeout: 10000 })
                .contains(listName)
                .should("have.class", "bg-white");
        });

        it("should navigate between different options lists", () => {
            const list1Name = `Test List 1 ${faker.word.noun()}`;
            const list2Name = `Test List 2 ${faker.word.noun()}`;

            // Create first list
            cy.visitAndCheck("/optionsLists/new");
            cy.findByLabelText(/name/i).type(list1Name);
            cy.findByRole("button", { name: /save/i }).click();

            // Create second list
            cy.findByRole("link", { name: /new options list/i }).click();
            cy.findByLabelText(/name/i).type(list2Name);
            cy.findByRole("button", { name: /save/i }).click();

            // Navigate back to lists page
            cy.visit("/optionsLists");

            // Should see both lists with timeout
            cy.contains(list1Name, { timeout: 10000 });
            cy.contains(list2Name, { timeout: 10000 });

            // Click on first list and wait for content
            cy.get(`a[href*="/optionsLists/"]`).contains(list1Name).click();
            cy.url({ timeout: 10000 }).should("include", "/optionsLists/");
            cy.get("h3", { timeout: 10000 }).should("contain", list1Name);

            // Click on second list and wait for content
            cy.get(`a[href*="/optionsLists/"]`).contains(list2Name).click();
            cy.url({ timeout: 10000 }).should("include", "/optionsLists/");
            cy.get("h3", { timeout: 10000 }).should("contain", list2Name);
        });
    });
});