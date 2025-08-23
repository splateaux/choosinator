import { createId } from "@paralleldrive/cuid2";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAzureDatabase } from "~/lib/azure-db.server";

import {
  createOption,
  getOptionsForList,
  updateOption,
  deleteOption,
} from "./option.server";

// Mock the Azure database
vi.mock("~/lib/azure-db.server", () => ({
  getAzureDatabase: vi.fn(),
}));

describe("Option Model", () => {
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

  describe("createOption", () => {
    it("creates a new option", async () => {
      const optionsListId = createId();
      const name = "New Option";
      const description = "Option description";

      const result = await createOption({ optionsListId, name, description });

      expect(result.name).toBe(name);
      expect(result.description).toBe(description);
      expect(result.optionsListId).toBe(optionsListId);
      expect(result.id).toBeDefined();
    });
  });

  describe("getOptionsForList", () => {
    it("returns options for a list", async () => {
      const optionsListId = createId();
      mockDb.query.mockResolvedValue([]);

      const result = await getOptionsForList(optionsListId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("updateOption", () => {
    it("updates an existing option", async () => {
      const optionsListId = createId();
      const id = createId();
      const newName = "Updated Option";
      const newDescription = "Updated description";

      mockDb.get.mockResolvedValue({
        id,
        optionsListId,
        name: "Old Name",
        description: "Old description",
      });

      const result = await updateOption({
        optionsListId,
        id,
        name: newName,
        description: newDescription,
      });

      expect(result?.name).toBe(newName);
      expect(result?.description).toBe(newDescription);
    });

    it("returns null when option not found", async () => {
      const optionsListId = createId();
      const id = createId();

      mockDb.get.mockResolvedValue(null);

      const result = await updateOption({
        optionsListId,
        id,
        name: "New Name",
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteOption", () => {
    it("deletes an option", async () => {
      const optionsListId = createId();
      const id = createId();

      await expect(deleteOption({ optionsListId, id })).resolves.not.toThrow();
    });
  });
});
