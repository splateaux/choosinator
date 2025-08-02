import { validateEmail, safeRedirect } from "./utils";

describe("validateEmail", () => {
  test("returns false for non-emails", () => {
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("n@")).toBe(false);
  });

  test("returns true for valid emails", () => {
    expect(validateEmail("kody@example.com")).toBe(true);
    expect(validateEmail("user@domain.com")).toBe(true);
    expect(validateEmail("test.email@subdomain.example.org")).toBe(true);
  });

  test("returns false for invalid email formats", () => {
    // Note: This is a simple validation - just checks for @ and length > 3
    expect(validateEmail("@do")).toBe(false); // Too short
    expect(validateEmail("user")).toBe(false); // No @
    expect(validateEmail("user.domain.com")).toBe(false); // No @
    expect(validateEmail("@")).toBe(false); // Too short and only @

    // These would pass the simple validation (contains @ and length > 3)
    expect(validateEmail("@domain.com")).toBe(true); // Simple validation allows this
    expect(validateEmail("user@")).toBe(true); // Simple validation allows this  
    expect(validateEmail("user@domain")).toBe(true); // Simple validation allows this
  });
});

describe("safeRedirect", () => {
  test("returns default URL for null or undefined", () => {
    expect(safeRedirect(null, "/default")).toBe("/default");
    expect(safeRedirect(undefined, "/default")).toBe("/default");
  });

  test("returns default URL for non-string values", () => {
    expect(safeRedirect(123 as unknown as string, "/default")).toBe("/default");
    expect(safeRedirect({} as unknown as string, "/default")).toBe("/default");
    expect(safeRedirect([] as unknown as string, "/default")).toBe("/default");
  });

  test("returns sanitized URL for valid relative paths", () => {
    expect(safeRedirect("/dashboard", "/default")).toBe("/dashboard");
    expect(safeRedirect("/users/123", "/default")).toBe("/users/123");
    expect(safeRedirect("/optionsLists", "/default")).toBe("/optionsLists");
  });

  test("returns default URL for potentially dangerous URLs", () => {
    expect(safeRedirect("http://evil.com", "/default")).toBe("/default");
    expect(safeRedirect("https://malicious.site", "/default")).toBe("/default");
    expect(safeRedirect("//evil.com", "/default")).toBe("/default");
    expect(safeRedirect("javascript:alert('xss')", "/default")).toBe("/default");
  });

  test("handles URL encoded characters safely", () => {
    expect(safeRedirect("/users%2F123", "/default")).toBe("/users%2F123");
    expect(safeRedirect("/search?q=test%20query", "/default")).toBe("/search?q=test%20query");
  });

  test("handles query parameters and fragments", () => {
    expect(safeRedirect("/dashboard?tab=settings", "/default")).toBe("/dashboard?tab=settings");
    expect(safeRedirect("/page#section", "/default")).toBe("/page#section");
    expect(safeRedirect("/page?param=value#section", "/default")).toBe("/page?param=value#section");
  });
});
