import bcrypt from "bcryptjs";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createUser, getUserByEmail, getUserById, verifyLogin, deleteUser } from "./user.server";

// Mock architect functions
vi.mock("@architect/functions", () => {
    const mockTables = vi.fn();
    return {
        default: {
            tables: mockTables,
        },
    };
});

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

// Mock invariant
vi.mock("tiny-invariant", () => ({
    default: vi.fn(),
}));

describe("User Server Model", () => {
    const mockDb = {
        user: {
            put: vi.fn(),
            get: vi.fn(),
            query: vi.fn(),
            delete: vi.fn(),
        },
        password: {
            put: vi.fn(),
            query: vi.fn(),
            delete: vi.fn(),
        },
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const arc = await import("@architect/functions");
        arc.default.tables.mockResolvedValue(mockDb);
    });

    describe("createUser", () => {
        it("should create a new user successfully", async () => {
            const email = "test@example.com";
            const password = "testpassword123";
            const hashedPassword = "hashed-password";

            (bcrypt.hash as vi.MockedFunction<typeof bcrypt.hash>).mockResolvedValue(hashedPassword);
            mockDb.user.query.mockResolvedValue({
                Items: [{
                    userId: `email#${email}`,
                    email,
                }],
            });

            const result = await createUser(email, password);

            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(mockDb.password.put).toHaveBeenCalledWith({
                userId: `email#${email}`,
                password: hashedPassword,
            });
            expect(mockDb.user.put).toHaveBeenCalledWith({
                userId: `email#${email}`,
                email,
            });
            expect(result).toEqual({
                id: `email#${email}`,
                email,
            });
        });
    });

    describe("getUserByEmail", () => {
        it("should return user when found", async () => {
            const email = "test@example.com";
            const mockUser = {
                userId: `email#${email}`,
                email,
            };

            mockDb.user.query.mockResolvedValue({
                Items: [mockUser],
            });

            const result = await getUserByEmail(email);

            expect(mockDb.user.query).toHaveBeenCalledWith({
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: { ":userId": `email#${email}` },
            });
            expect(result).toEqual({
                id: `email#${email}`,
                email,
            });
        });

        it("should return null when user not found", async () => {
            mockDb.user.query.mockResolvedValue({
                Items: [],
            });

            const result = await getUserByEmail("nonexistent@example.com");

            expect(result).toBeNull();
        });
    });

    describe("getUserById", () => {
        it("should return user when found", async () => {
            const userId = "email#test@example.com";
            const mockUser = {
                userId,
                email: "test@example.com",
            };

            mockDb.user.query.mockResolvedValue({
                Items: [mockUser],
            });

            const result = await getUserById(userId);

            expect(mockDb.user.query).toHaveBeenCalledWith({
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: { ":userId": userId },
            });
            expect(result).toEqual({
                id: userId,
                email: "test@example.com",
            });
        });

        it("should return null when user not found", async () => {
            mockDb.user.query.mockResolvedValue({
                Items: [],
            });

            const result = await getUserById("email#nonexistent@example.com");

            expect(result).toBeNull();
        });
    });

    describe("verifyLogin", () => {
        it("should return user when credentials are valid", async () => {
            const email = "test@example.com";
            const password = "testpassword123";
            const hashedPassword = "hashed-password";

            // Mock password query
            mockDb.password.query.mockResolvedValue({
                Items: [{ password: hashedPassword }],
            });

            // Mock bcrypt compare
            (bcrypt.compare as vi.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(true);

            // Mock getUserByEmail
            mockDb.user.query.mockResolvedValue({
                Items: [{
                    userId: `email#${email}`,
                    email,
                }],
            });

            const result = await verifyLogin(email, password);

            expect(mockDb.password.query).toHaveBeenCalledWith({
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: { ":userId": `email#${email}` },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toEqual({
                id: `email#${email}`,
                email,
            });
        });

        it("should return undefined when user has no password", async () => {
            mockDb.password.query.mockResolvedValue({ Items: [] });

            const result = await verifyLogin("test@example.com", "password");

            expect(result).toBeUndefined();
        });

        it("should return undefined when password is invalid", async () => {
            const email = "test@example.com";
            const hashedPassword = "hashed-password";

            mockDb.password.query.mockResolvedValue({
                Items: [{ password: hashedPassword }],
            });
            (bcrypt.compare as vi.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(false);

            const result = await verifyLogin(email, "wrong-password");

            expect(bcrypt.compare).toHaveBeenCalledWith("wrong-password", hashedPassword);
            expect(result).toBeUndefined();
        });
    });

    describe("deleteUser", () => {
        it("should delete user successfully", async () => {
            const email = "test@example.com";
            mockDb.user.delete.mockResolvedValue({});

            await deleteUser(email);

            expect(mockDb.user.delete).toHaveBeenCalledWith({
                userId: `email#${email}`,
            });
        });
    });
});