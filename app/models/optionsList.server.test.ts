import { createId } from "@paralleldrive/cuid2";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAzureDatabase } from "~/lib/azure-db.server";

import {
  getOptionsList,
  createOptionsList,
  deleteOptionsList,
} from "./optionsList.server";

// Mock the Azure database
vi.mock("~/lib/azure-db.server", () => ({
  getAzureDatabase: vi.fn(),
}));

describe("OptionsList Model", () => {
  const mockDb = {
    client: {} as any,
    database: {} as any,
    containers: new Map(),
    getContainer: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getAzureDatabase).mockReturnValue(mockDb as any);

    // Set up default mock implementations
    mockDb.query.mockResolvedValue([]);
    mockDb.get.mockResolvedValue(null);
    mockDb.put.mockImplementation((container, item) => Promise.resolve(item));
    mockDb.delete.mockResolvedValue(undefined);
  });

  describe("getOptionsList", () => {
    it("returns options list when found", async () => {
      const id = createId();
      const ownerUserId = "email#test@example.com";
      const name = "Test List";

      mockDb.get.mockResolvedValue({
        id,
        name,
        ownerUserId,
      });

      const result = await getOptionsList({ id, ownerUserId });

      expect(result?.id).toBe(id);
      expect(result?.name).toBe(name);
      expect(result?.ownerUserId).toBe(ownerUserId);
    });

    it("returns null when options list not found", async () => {
      const id = createId();
      const ownerUserId = "email#test@example.com";

      mockDb.get.mockResolvedValue(null);

      const result = await getOptionsList({ id, ownerUserId });

      expect(result).toBeNull();
    });
  });

  describe("createOptionsList", () => {
    it("creates a new options list", async () => {
      const name = "New List";
      const ownerUserId = "email#test@example.com";

      const result = await createOptionsList({ name, ownerUserId });

      expect(result.name).toBe(name);
      expect(result.ownerUserId).toBe(ownerUserId);
      expect(result.id).toBeDefined();
    });
  });

  describe("deleteOptionsList", () => {
    it("deletes an options list", async () => {
      const id = createId();
      const ownerUserId = "email#test@example.com";

      await expect(
        deleteOptionsList({ id, ownerUserId }),
      ).resolves.not.toThrow();
    });
  });
});
