import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";

import { createUserSession, getUserId, getUser, requireUserId, requireUser, logout, sessionStorage } from "./session.server";

// Mock Remix node
vi.mock("@remix-run/node", () => {
    const mockSessionStorage = {
        getSession: vi.fn(),
        commitSession: vi.fn(),
        destroySession: vi.fn(),
    };
    return {
        createCookieSessionStorage: vi.fn(() => mockSessionStorage),
        redirect: vi.fn((url, init) => ({ url, init })),
    };
});



// Mock user model
vi.mock("~/models/user.server", () => ({
    getUserById: vi.fn(),
}));

describe("Session Server", () => {
    const mockSessionStorage = {
        getSession: vi.fn(),
        commitSession: vi.fn(),
        destroySession: vi.fn(),
    };

    const mockSession = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        unset: vi.fn(),
        flash: vi.fn(),
        id: "mock-session-id",
        data: {},
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        
        // Mock the sessionStorage functions directly
        vi.spyOn(sessionStorage, 'getSession').mockResolvedValue(mockSession);
        vi.spyOn(sessionStorage, 'commitSession').mockResolvedValue("committed-session");
        vi.spyOn(sessionStorage, 'destroySession').mockResolvedValue("destroyed-session");
    });

    describe("getUserId", () => {
        it("should return user ID when session exists", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";

            mockSession.get.mockReturnValue(userId);

            const result = await getUserId(mockRequest);

            expect(sessionStorage.getSession).toHaveBeenCalledWith(
                mockRequest.headers.get("Cookie")
            );
            expect(mockSession.get).toHaveBeenCalledWith("userId");
            expect(result).toBe(userId);
        });

        it("should return undefined when no session", async () => {
            const mockRequest = new Request("http://localhost");

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(undefined);

            const result = await getUserId(mockRequest);

            expect(result).toBeUndefined();
        });
    });

    describe("getUser", () => {
        it("should return user when session exists and user is found", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";
            const mockUser = { id: userId as `email#${string}`, email: "test@example.com" };

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(userId);

            const { getUserById } = await import("~/models/user.server");
            (getUserById as MockedFunction<typeof getUserById>).mockResolvedValue(mockUser);

            const result = await getUser(mockRequest);

            expect(getUserById).toHaveBeenCalledWith(userId);
            expect(result).toBe(mockUser);
        });

        it("should return null when no session", async () => {
            const mockRequest = new Request("http://localhost");

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(undefined);

            const result = await getUser(mockRequest);

            expect(result).toBeNull();
        });

        it("should throw logout redirect when user not found", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";

            mockSession.get.mockReturnValue(userId);

            const { getUserById } = await import("~/models/user.server");
            (getUserById as MockedFunction<typeof getUserById>).mockResolvedValue(null);

            const mockLogoutResponse = { url: "/", init: { headers: { "Set-Cookie": "destroyed-session" } } };
            const remix = await import("@remix-run/node");
            (remix.redirect as MockedFunction<typeof remix.redirect>).mockReturnValue(mockLogoutResponse as any);

            await expect(getUser(mockRequest)).rejects.toBe(mockLogoutResponse);
        });
    });

    describe("requireUserId", () => {
        it("should return user ID when session exists", async () => {
            const mockRequest = new Request("http://localhost/test");
            const userId = "email#test@example.com";

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(userId);

            const result = await requireUserId(mockRequest);

            expect(result).toBe(userId);
        });

        it("should throw logout redirect when no session", async () => {
            const mockRequest = new Request("http://localhost/test");

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(undefined);

            const mockLogoutResponse = { url: "/login" };
            mockSessionStorage.destroySession.mockResolvedValue("destroyed-session");
            const remix = await import("@remix-run/node");
            (remix.redirect as MockedFunction<typeof remix.redirect>).mockReturnValue(mockLogoutResponse as any);

            await expect(requireUserId(mockRequest)).rejects.toBe(mockLogoutResponse);
        });
    });

    describe("requireUser", () => {
        it("should return user when session exists and user is found", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";
            const mockUser = { id: userId as `email#${string}`, email: "test@example.com" };

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(userId);

            const { getUserById } = await import("~/models/user.server");
            (getUserById as MockedFunction<typeof getUserById>).mockResolvedValue(mockUser);

            const result = await requireUser(mockRequest);

            expect(result).toBe(mockUser);
        });

        it("should throw logout redirect when user not found", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSession.get.mockReturnValue(userId);

            const { getUserById } = await import("~/models/user.server");
            (getUserById as MockedFunction<typeof getUserById>).mockResolvedValue(null);

            const mockLogoutResponse = { url: "/login" };
            mockSessionStorage.destroySession.mockResolvedValue("destroyed-session");
            const remix = await import("@remix-run/node");
            (remix.redirect as MockedFunction<typeof remix.redirect>).mockReturnValue(mockLogoutResponse as any);

            await expect(requireUser(mockRequest)).rejects.toBe(mockLogoutResponse);
        });
    });

    describe("createUserSession", () => {
        it("should create session and redirect", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";
            const redirectTo = "/dashboard";

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSessionStorage.commitSession.mockResolvedValue("committed-session");

            const remix = await import("@remix-run/node");
            const expectedRedirect = { url: redirectTo, init: expect.any(Object) };
            (remix.redirect as MockedFunction<typeof remix.redirect>).mockReturnValue(expectedRedirect as any);

            const result = await createUserSession({
                request: mockRequest,
                userId,
                remember: true,
                redirectTo,
            });

            expect(mockSession.set).toHaveBeenCalledWith("userId", userId);
            expect(sessionStorage.commitSession).toHaveBeenCalledWith(mockSession, {
                maxAge: 60 * 60 * 24 * 7, // 7 days for remember=true
            });
            expect(remix.redirect).toHaveBeenCalledWith(redirectTo, {
                headers: {
                    "Set-Cookie": "committed-session",
                },
            });
            expect(result).toBe(expectedRedirect);
        });

        it("should not set maxAge when remember is false", async () => {
            const mockRequest = new Request("http://localhost");
            const userId = "email#test@example.com";
            const redirectTo = "/dashboard";

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSessionStorage.commitSession.mockResolvedValue("committed-session");

            const remix = await import("@remix-run/node");
            (remix.redirect as MockedFunction<typeof remix.redirect>).mockReturnValue({} as any);

            await createUserSession({
                request: mockRequest,
                userId,
                remember: false,
                redirectTo,
            });

            expect(sessionStorage.commitSession).toHaveBeenCalledWith(mockSession, {
                maxAge: undefined,
            });
        });
    });

    describe("logout", () => {
        it("should destroy session and redirect to login", async () => {
            const mockRequest = new Request("http://localhost");

            mockSessionStorage.getSession.mockResolvedValue(mockSession);
            mockSessionStorage.destroySession.mockResolvedValue("destroyed-session");

            const remix = await import("@remix-run/node");
            const expectedRedirect = { url: "/", init: expect.any(Object) };
            (remix.redirect as MockedFunction<typeof remix.redirect>).mockReturnValue(expectedRedirect as any);

            const result = await logout(mockRequest);

            expect(sessionStorage.destroySession).toHaveBeenCalledWith(mockSession);
            expect(remix.redirect).toHaveBeenCalledWith("/", {
                headers: {
                    "Set-Cookie": "destroyed-session",
                },
            });
            expect(result).toBe(expectedRedirect);
        });
    });
});