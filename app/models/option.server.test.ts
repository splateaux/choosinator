import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";

import {
  createOption,
  updateOption,
  deleteOption,
  getOptionsForList,
  OptionNameConflictError,
} from "./option.server";

// Mock architect functions
vi.mock("@architect/functions", () => {
  const mockTables = vi.fn();
  return {
    default: {
      tables: mockTables,
    },
  };
});

// Mock cuid2
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "test-option-id-123"),
}));

describe("Option Server Model", () => {
  const mockDb = {
    option: {
      put: vi.fn(),
      get: vi.fn(),
      query: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const arc = await import("@architect/functions");
    (
      arc.default.tables as MockedFunction<typeof arc.default.tables>
    ).mockResolvedValue(mockDb as any);
  });

  describe("createOption", () => {
    it("should create a new option successfully", async () => {
      const mockResult = {
        optionId: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Test Option",
        description: "Test Description",
      };

      mockDb.option.put.mockResolvedValue(mockResult);
      mockDb.option.query.mockResolvedValue({ Items: [] });

      const result = await createOption({
        optionsListId: "test-list-id",
        name: "Test Option",
        description: "Test Description",
      });

      expect(mockDb.option.put).toHaveBeenCalledWith({
        optionsListId: "test-list-id",
        optionId: "test-option-id-123",
        name: "Test Option",
        description: "Test Description",
      });

      expect(result).toEqual({
        id: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Test Option",
        description: "Test Description",
      });
    });

    it("should throw OptionNameConflictError when creating option with duplicate name (case insensitive)", async () => {
      const existingOptions = [
        {
          optionId: "existing-option-id",
          optionsListId: "test-list-id",
          name: "Existing Option",
          description: "Existing Description",
        },
      ];

      mockDb.option.query.mockResolvedValue({ Items: existingOptions });

      await expect(
        createOption({
          optionsListId: "test-list-id",
          name: "existing option", // Different case
          description: "New Description",
        }),
      ).rejects.toThrow(OptionNameConflictError);

      await expect(
        createOption({
          optionsListId: "test-list-id",
          name: "EXISTING OPTION", // Different case
          description: "New Description",
        }),
      ).rejects.toThrow(OptionNameConflictError);

      expect(mockDb.option.put).not.toHaveBeenCalled();
    });

    it("should allow creating option with different name", async () => {
      const existingOptions = [
        {
          optionId: "existing-option-id",
          optionsListId: "test-list-id",
          name: "Existing Option",
          description: "Existing Description",
        },
      ];

      const mockResult = {
        optionId: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Different Option",
        description: "New Description",
      };

      mockDb.option.query.mockResolvedValue({ Items: existingOptions });
      mockDb.option.put.mockResolvedValue(mockResult);

      const result = await createOption({
        optionsListId: "test-list-id",
        name: "Different Option",
        description: "New Description",
      });

      expect(result.name).toBe("Different Option");
      expect(mockDb.option.put).toHaveBeenCalled();
    });
  });

  describe("updateOption", () => {
    it("should update an option successfully", async () => {
      const currentOption = {
        optionId: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Current Name",
        description: "Current Description",
      };

      const updatedResult = {
        ...currentOption,
        name: "Updated Name",
        description: "Updated Description",
      };

      mockDb.option.get.mockResolvedValue(currentOption);
      mockDb.option.put.mockResolvedValue(updatedResult);
      mockDb.option.query.mockResolvedValue({ Items: [currentOption] });

      const result = await updateOption({
        optionsListId: "test-list-id",
        id: "test-option-id-123",
        name: "Updated Name",
        description: "Updated Description",
      });

      expect(result).toEqual({
        id: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Updated Name",
        description: "Updated Description",
      });
    });

    it("should throw OptionNameConflictError when updating to duplicate name (case insensitive)", async () => {
      const currentOption = {
        optionId: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Current Name",
        description: "Current Description",
      };

      const existingOptions = [
        currentOption,
        {
          optionId: "other-option-id",
          optionsListId: "test-list-id",
          name: "Other Option",
          description: "Other Description",
        },
      ];

      mockDb.option.get.mockResolvedValue(currentOption);
      mockDb.option.query.mockResolvedValue({ Items: existingOptions });

      await expect(
        updateOption({
          optionsListId: "test-list-id",
          id: "test-option-id-123",
          name: "other option", // Different case
          description: "Updated Description",
        }),
      ).rejects.toThrow(OptionNameConflictError);

      expect(mockDb.option.put).not.toHaveBeenCalled();
    });

    it("should allow updating to same name (same option)", async () => {
      const currentOption = {
        optionId: "test-option-id-123",
        optionsListId: "test-list-id",
        name: "Current Name",
        description: "Current Description",
      };

      const updatedResult = {
        ...currentOption,
        description: "Updated Description",
      };

      mockDb.option.get.mockResolvedValue(currentOption);
      mockDb.option.put.mockResolvedValue(updatedResult);
      mockDb.option.query.mockResolvedValue({ Items: [currentOption] });

      const result = await updateOption({
        optionsListId: "test-list-id",
        id: "test-option-id-123",
        description: "Updated Description",
      });

      expect(result?.name).toBe("Current Name");
      expect(result?.description).toBe("Updated Description");
      expect(mockDb.option.put).toHaveBeenCalled();
    });

    it("should return null when option not found", async () => {
      mockDb.option.get.mockResolvedValue(null);

      const result = await updateOption({
        optionsListId: "test-list-id",
        id: "non-existent-id",
        name: "New Name",
      });

      expect(result).toBeNull();
      expect(mockDb.option.put).not.toHaveBeenCalled();
    });
  });

  describe("deleteOption", () => {
    it("should delete an option successfully", async () => {
      mockDb.option.delete.mockResolvedValue(undefined);

      await deleteOption({
        optionsListId: "test-list-id",
        id: "test-option-id-123",
      });

      expect(mockDb.option.delete).toHaveBeenCalledWith({
        optionsListId: "test-list-id",
        optionId: "test-option-id-123",
      });
    });
  });

  describe("getOptionsForList", () => {
    it("should return options sorted by name", async () => {
      const mockItems = [
        {
          optionId: "option-2",
          optionsListId: "test-list-id",
          name: "Zebra",
          description: "Zebra description",
        },
        {
          optionId: "option-1",
          optionsListId: "test-list-id",
          name: "Apple",
          description: "Apple description",
        },
        {
          optionId: "option-3",
          optionsListId: "test-list-id",
          name: "Banana",
          description: "Banana description",
        },
      ];

      mockDb.option.query.mockResolvedValue({ Items: mockItems });

      const result = await getOptionsForList("test-list-id");

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Apple");
      expect(result[1].name).toBe("Banana");
      expect(result[2].name).toBe("Zebra");
    });

    it("should handle empty options list", async () => {
      mockDb.option.query.mockResolvedValue({ Items: [] });

      const result = await getOptionsForList("test-list-id");

      expect(result).toHaveLength(0);
    });

    it("should handle options with missing name/description", async () => {
      const mockItems = [
        {
          optionId: "option-1",
          optionsListId: "test-list-id",
          name: undefined,
          description: undefined,
        },
      ];

      mockDb.option.query.mockResolvedValue({ Items: mockItems });

      const result = await getOptionsForList("test-list-id");

      expect(result[0].name).toBe("");
      expect(result[0].description).toBe("");
    });
  });
});
