import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOptionsList, getOptionsList, getOptionsListsByOwner, deleteOptionsList } from "./optionsList.server";

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
    createId: vi.fn(() => "test-id-123"),
}));

describe("OptionsList Server Model", () => {
    const mockDb = {
        optionsList: {
            put: vi.fn(),
            get: vi.fn(),
            query: vi.fn(),
            delete: vi.fn(),
        },
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const arc = await import("@architect/functions");
        arc.default.tables.mockResolvedValue(mockDb);
    });

    describe("createOptionsList", () => {
        it("should create a new options list successfully", async () => {
            const mockResult = {
                optionsListId: "test-id-123",
                userId: "user-123",
                name: "Test List",
            };

            mockDb.optionsList.put.mockResolvedValue(mockResult);

            const result = await createOptionsList({
                name: "Test List",
                ownerUserId: "user-123",
            });

            expect(mockDb.optionsList.put).toHaveBeenCalledWith({
                userId: "user-123",
                optionsListId: "test-id-123",
                name: "Test List",
            });

            expect(result).toEqual({
                id: "test-id-123",
                ownerUserId: "user-123",
                name: "Test List",
            });
        });
    });

    describe("getOptionsList", () => {
        it("should return options list when found", async () => {
            const mockResult = {
                optionsListId: "test-id-123",
                userId: "user-123",
                name: "Test List",
            };

            mockDb.optionsList.get.mockResolvedValue(mockResult);

            const result = await getOptionsList({
                id: "test-id-123",
                ownerUserId: "user-123",
            });

            expect(mockDb.optionsList.get).toHaveBeenCalledWith({
                userId: "user-123",
                optionsListId: "test-id-123",
            });

            expect(result).toEqual({
                id: "test-id-123",
                ownerUserId: "user-123",
                name: "Test List",
            });
        });

        it("should return null when options list not found", async () => {
            mockDb.optionsList.get.mockResolvedValue(null);

            const result = await getOptionsList({
                id: "non-existent",
                ownerUserId: "user-123",
            });

            expect(result).toBeNull();
        });
    });

    describe("getOptionsListsByOwner", () => {
        it("should return all options lists for a user", async () => {
            const mockResults = {
                Items: [
                    {
                        optionsListId: "list-1",
                        userId: "user-123",
                        name: "List 1",
                    },
                    {
                        optionsListId: "list-2",
                        userId: "user-123",
                        name: "List 2",
                    },
                ],
            };

            mockDb.optionsList.query.mockResolvedValue(mockResults);

            const result = await getOptionsListsByOwner("user-123");

            expect(mockDb.optionsList.query).toHaveBeenCalledWith({
                KeyConditionExpression: 'userId = :ownerUserId',
                ExpressionAttributeValues: {
                    ':ownerUserId': 'user-123',
                },
            });

            expect(result).toEqual([
                {
                    id: "list-1",
                    ownerUserId: "user-123",
                    name: "List 1",
                },
                {
                    id: "list-2",
                    ownerUserId: "user-123",
                    name: "List 2",
                },
            ]);
        });

        it("should return empty array when user has no options lists", async () => {
            const mockResults = {
                Items: [],
            };

            mockDb.optionsList.query.mockResolvedValue(mockResults);

            const result = await getOptionsListsByOwner("user-123");

            expect(result).toEqual([]);
        });
    });

    describe("deleteOptionsList", () => {
        it("should delete options list successfully", async () => {
            mockDb.optionsList.delete.mockResolvedValue({});

            await deleteOptionsList({
                id: "test-id-123",
                ownerUserId: "user-123",
            });

            expect(mockDb.optionsList.delete).toHaveBeenCalledWith({
                userId: "user-123",
                optionsListId: "test-id-123",
            });
        });
    });
});