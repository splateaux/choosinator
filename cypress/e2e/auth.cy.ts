import { faker } from "@faker-js/faker";

describe("Authentication", () => {
    describe("User Registration", () => {
        it("should register a new user successfully", () => {
            const email = `${faker.internet.userName()}@example.com`;
            const password = faker.internet.password({ length: 10 });

            cy.visitAndCheck("/join");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type(password);
            cy.findByRole("button", { name: /create account/i }).click();

            // Should be redirected and logged in
            cy.url().should("eq", Cypress.config().baseUrl + "/");
            cy.contains(email);
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should show error for invalid email", () => {
            cy.visitAndCheck("/join");

            cy.findByRole("textbox", { name: /email/i }).type("invalid-email");
            cy.findByLabelText(/password/i).type("validpassword123");
            cy.findByRole("button", { name: /create account/i }).click();

            cy.contains("Email is invalid");
        });

        it("should show error for short password", () => {
            const email = `${faker.internet.userName()}@example.com`;

            cy.visitAndCheck("/join");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type("short");
            cy.findByRole("button", { name: /create account/i }).click();

            cy.contains("Password is too short");
        });

        it("should show error for empty password", () => {
            const email = `${faker.internet.userName()}@example.com`;

            cy.visitAndCheck("/join");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByRole("button", { name: /create account/i }).click();

            cy.contains("Password is required");
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should show error for duplicate email", () => {
            const email = `${faker.internet.userName()}@example.com`;
            const password = faker.internet.password({ length: 10 });

            // Create first user
            cy.request("POST", "/__tests/create-user", { email });

            // Try to register with same email
            cy.visitAndCheck("/join");
            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type(password);
            cy.findByRole("button", { name: /create account/i }).click();

            cy.contains("A user already exists with this email");
        });
    });

    describe("User Login", () => {
        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should login with valid credentials", () => {
            const email = `${faker.internet.userName()}@example.com`;
            const password = "myreallystrongpassword"; // This is the default password from create-user test route

            // Create user first
            cy.request("POST", "/__tests/create-user", { email });

            cy.visitAndCheck("/login");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type(password);
            cy.findByRole("button", { name: /log in/i }).click();

            // Should be redirected and logged in
            cy.url().should("eq", Cypress.config().baseUrl + "/");
            cy.contains(email);
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should show error for invalid email format", () => {
            cy.visitAndCheck("/login");

            cy.findByRole("textbox", { name: /email/i }).type("invalid-email");
            cy.findByLabelText(/password/i).type("somepassword");
            cy.findByRole("button", { name: /log in/i }).click();

            cy.contains("Email is invalid");
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should show error for wrong password", () => {
            const email = `${faker.internet.userName()}@example.com`;

            // Create user first
            cy.request("POST", "/__tests/create-user", { email });

            cy.visitAndCheck("/login");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type("wrongpassword");
            cy.findByRole("button", { name: /log in/i }).click();

            cy.contains("Invalid email or password");
        });

        it("should show error for non-existent user", () => {
            const email = `${faker.internet.userName()}@example.com`;

            cy.visitAndCheck("/login");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type("somepassword123");
            cy.findByRole("button", { name: /log in/i }).click();

            cy.contains("Invalid email or password");
        });

        it("should show error for short password", () => {
            const email = `${faker.internet.userName()}@example.com`;

            cy.visitAndCheck("/login");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type("short");
            cy.findByRole("button", { name: /log in/i }).click();

            cy.contains("Password is too short");
        });

        it("should show error for empty password", () => {
            const email = `${faker.internet.userName()}@example.com`;

            cy.visitAndCheck("/login");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByRole("button", { name: /log in/i }).click();

            cy.contains("Password is required");
        });

        // TODO: Remove when implementing third-party auth (Google/Discord)
        it.skip("should redirect to options lists when remember me is checked", () => {
            const email = `${faker.internet.userName()}@example.com`;
            const password = "myreallystrongpassword";

            // Create user first
            cy.request("POST", "/__tests/create-user", { email });

            cy.visitAndCheck("/login?redirectTo=/optionsLists");

            cy.findByRole("textbox", { name: /email/i }).type(email);
            cy.findByLabelText(/password/i).type(password);
            cy.findByLabelText(/remember me/i).check();
            cy.findByRole("button", { name: /log in/i }).click();

            cy.url().should("include", "/optionsLists");
        });
    });

    describe("Logout", () => {
        it("should logout successfully", () => {
            const email = `${faker.internet.userName()}@example.com`;

            cy.login({ email });
            cy.visitAndCheck("/");

            cy.findByRole("button", { name: /log out/i }).click();

            cy.url().should("eq", Cypress.config().baseUrl + "/");
            cy.findByRole("link", { name: /log in/i });
            cy.findByRole("link", { name: /sign up/i });
        });
    });
});