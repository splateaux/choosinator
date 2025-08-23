import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAzureDatabase } from "~/lib/azure-db.server";

import {
  createUser,
  getUserByEmail,
  verifyLogin,
  deleteUser,
} from "./user.server";

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock the Azure database
vi.mock("~/lib/azure-db.server", () => ({
  getAzureDatabase: vi.fn(),
}));

describe("User Model", () => {
  const mockDb = {
    getContainer: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getAzureDatabase).mockReturnValue(mockDb);

    // Set up default mock implementations
    mockDb.query.mockResolvedValue([]);
    mockDb.get.mockResolvedValue(null);
    mockDb.put.mockImplementation((container, item) => Promise.resolve(item));
    mockDb.delete.mockResolvedValue(undefined);
  });

  describe("createUser", () => {
    it("creates a user with hashed password", async () => {
      const email = "test@example.com";
      const password = "password123";

      // Mock the getUserByEmail call that happens internally
      mockDb.query.mockResolvedValueOnce([
        {
          userId: `email#${email}`,
          email,
          name: "Test User",
        },
      ]);

      const user = await createUser(email, password);

      expect(user.email).toBe(email);
      expect(user.id).toBe(`email#${email}`);
    });
  });

  describe("getUserByEmail", () => {
    it("returns user when found", async () => {
      const email = "test@example.com";

      mockDb.query.mockResolvedValue([
        {
          userId: `email#${email}`,
          email,
          name: "Test User",
        },
      ]);

      const user = await getUserByEmail(email);

      expect(user?.email).toBe(email);
      expect(user?.id).toBe(`email#${email}`);
    });

    it("returns null when user not found", async () => {
      const email = "nonexistent@example.com";

      mockDb.query.mockResolvedValue([]);

      const user = await getUserByEmail(email);

      expect(user).toBeNull();
    });
  });

  describe("verifyLogin", () => {
    it("returns user when credentials are valid", async () => {
      const email = "test@example.com";
      const password = "password123";

      // Mock the getUserPasswordByEmail call
      mockDb.query.mockResolvedValueOnce([
        {
          userId: `email#${email}`,
          password: "hashed_password",
        },
      ]);

      // Mock the getUserByEmail call that happens internally
      mockDb.query.mockResolvedValueOnce([
        {
          userId: `email#${email}`,
          email,
          name: "Test User",
        },
      ]);

      const user = await verifyLogin(email, password);

      expect(user?.email).toBe(email);
    });

    it("returns undefined when user not found", async () => {
      const email = "nonexistent@example.com";
      const password = "password123";

      // Mock empty result for password query
      mockDb.query.mockResolvedValue([]);

      const user = await verifyLogin(email, password);

      expect(user).toBeUndefined();
    });
  });

  describe("deleteUser", () => {
    it("deletes user and password records", async () => {
      const email = "test@example.com";

      await expect(deleteUser(email)).resolves.not.toThrow();
    });
  });
});
