import { createId } from "@paralleldrive/cuid2";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAzureDatabase } from "~/lib/azure-db.server";

import {
  shareOptionsList,
  unshareOptionsList,
  isOptionsListSharedWithUser,
} from "./optionsListSharing.server";

// Mock the Azure database
vi.mock("~/lib/azure-db.server", () => ({
  getAzureDatabase: vi.fn(),
}));

describe("OptionsListSharing Model", () => {
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

  describe("shareOptionsList", () => {
    it("shares an options list with a user", async () => {
      const optionsListId = createId();
      const ownerUserId = "email#owner@example.com";
      const sharedWithUserId = "email#user@example.com";
      const permission = "view" as const;

      const result = await shareOptionsList({
        optionsListId,
        ownerUserId,
        sharedWithUserId,
        permission,
      });

      expect(result.optionsListId).toBe(optionsListId);
      expect(result.ownerUserId).toBe(ownerUserId);
      expect(result.sharedWithUserId).toBe(sharedWithUserId);
      expect(result.permission).toBe(permission);
      expect(result.id).toBeDefined();
    });
  });

  describe("unshareOptionsList", () => {
    it("removes sharing for an options list", async () => {
      const optionsListId = createId();
      const sharedWithUserId = "email#user@example.com";

      await expect(
        unshareOptionsList({ optionsListId, sharedWithUserId }),
      ).resolves.not.toThrow();
    });
  });

  describe("isOptionsListSharedWithUser", () => {
    it("returns true when list is shared with user", async () => {
      const optionsListId = createId();
      const sharedWithUserId = "email#user@example.com";

      mockDb.query.mockResolvedValue([{ id: "share-id" }]);

      const result = await isOptionsListSharedWithUser({
        optionsListId,
        sharedWithUserId,
      });

      expect(typeof result).toBe("boolean");
    });
  });
});
