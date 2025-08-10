import { beforeEach, describe, expect, test, vi } from "vitest";

// In-memory database for mocking arc.tables
interface SharingRow {
  userId: string;
  optionsListId: string;
  sharedWithUserId: string;
  createdAt: string;
}

interface UserRow {
  userId: string;
  email: string;
}
interface PasswordRow {
  userId: string;
  password: string;
}
interface OptionsListRow {
  userId: string;
  optionsListId: string;
  name: string;
}

let sharingRows: SharingRow[] = [];
let userRows: UserRow[] = [];
let passwordRows: PasswordRow[] = [];
let optionsListRows: OptionsListRow[] = [];

vi.mock("@architect/functions", () => {
  return {
    default: {
      tables: async () => ({
        user: {
          put: async (item: UserRow) => {
            userRows.push(item);
            return item;
          },
          query: async ({ ExpressionAttributeValues }: any) => {
            const id = ExpressionAttributeValues[":userId"];
            const Items = userRows.filter((r) => r.userId === id);
            return { Items };
          },
          delete: async ({ userId }: { userId: string }) => {
            userRows = userRows.filter((r) => r.userId !== userId);
            return {} as any;
          },
        },
        password: {
          put: async (item: PasswordRow) => {
            passwordRows.push(item);
            return item;
          },
          query: async ({ ExpressionAttributeValues }: any) => {
            const id = ExpressionAttributeValues[":userId"];
            const Items = passwordRows.filter((r) => r.userId === id);
            return { Items };
          },
          delete: async ({ userId }: { userId: string }) => {
            passwordRows = passwordRows.filter((r) => r.userId !== userId);
            return {} as any;
          },
        },
        optionsList: {
          put: async (item: OptionsListRow) => {
            optionsListRows.push(item);
            return item;
          },
          get: async ({
            userId,
            optionsListId,
          }: {
            userId: string;
            optionsListId: string;
          }) => {
            const Item = optionsListRows.find(
              (r) => r.userId === userId && r.optionsListId === optionsListId,
            );
            return Item ?? null;
          },
          query: async (params: any) => {
            let Items = optionsListRows;
            if (params.IndexName === "optionsListId-index") {
              const v = params.ExpressionAttributeValues[":optionsListId"];
              Items = Items.filter((r) => r.optionsListId === v);
            } else if (
              params.KeyConditionExpression?.includes("userId = :ownerUserId")
            ) {
              const v = params.ExpressionAttributeValues[":ownerUserId"];
              Items = Items.filter((r) => r.userId === v);
            }
            return { Items };
          },
        },
        optionsListSharing: {
          put: async (item: SharingRow) => {
            sharingRows.push(item);
            return item;
          },
          delete: async ({
            userId,
            optionsListId,
          }: {
            userId: string;
            optionsListId: string;
          }) => {
            sharingRows = sharingRows.filter(
              (r) =>
                !(r.userId === userId && r.optionsListId === optionsListId),
            );
            return {} as any;
          },
          query: async (params: any) => {
            let Items = sharingRows;
            if (params.IndexName === "sharedWithUserId") {
              const v = params.ExpressionAttributeValues[":sharedWithUserId"];
              Items = Items.filter((r) => r.sharedWithUserId === v);
            }
            if (
              params.KeyConditionExpression?.includes("userId = :ownerUserId")
            ) {
              const v = params.ExpressionAttributeValues[":ownerUserId"];
              Items = Items.filter((r) => r.userId === v);
            }
            if (
              params.FilterExpression?.includes(
                "optionsListId = :optionsListId",
              )
            ) {
              const v = params.ExpressionAttributeValues[":optionsListId"];
              Items = Items.filter((r) => r.optionsListId === v);
            }
            if (
              params.FilterExpression?.includes(
                "sharedWithUserId = :sharedWithUserId",
              )
            ) {
              const v = params.ExpressionAttributeValues[":sharedWithUserId"];
              Items = Items.filter((r) => r.sharedWithUserId === v);
            }
            return { Items };
          },
        },
      }),
    },
  };
});

// Lightweight fakes for cross-module calls
vi.mock("./user.server", () => {
  return {
    createUser: async (email: string) => {
      const id = `email#${email}` as const;
      userRows.push({ userId: id, email });
      return { id, email };
    },
    getUserById: async (id: string) => {
      const row = userRows.find((u) => u.userId === id);
      return row ? { id: row.userId, email: row.email } : null;
    },
  };
});

vi.mock("./optionsList.server", () => {
  return {
    createOptionsList: async ({
      name,
      ownerUserId,
    }: {
      name: string;
      ownerUserId: string;
    }) => {
      const optionsListId =
        `options_${Math.random().toString(36).slice(2, 10)}` as const;
      optionsListRows.push({ userId: ownerUserId, optionsListId, name });
      return { id: optionsListId, name, ownerUserId };
    },
  };
});

import { createOptionsList } from "./optionsList.server";
import {
  getSharedOptionsListsForUser,
  getSharedUsersForOptionsList,
  isOptionsListSharedWithUser,
  shareOptionsList,
  unshareOptionsList,
} from "./optionsListSharing.server";
import { createUser } from "./user.server";

describe("OptionsListSharing", () => {
  beforeEach(() => {
    sharingRows = [];
    userRows = [];
    passwordRows = [];
    optionsListRows = [];
  });
  test("should share a list with another user", async () => {
    // Create test users
    const owner = await createUser("owner@test.com", "password123");
    const sharedUser = await createUser("shared@test.com", "password123");

    // Create a list
    const list = await createOptionsList({
      name: "Test List",
      ownerUserId: owner.id,
    });

    // Share the list
    const sharing = await shareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser.id,
    });

    expect(sharing.optionsListId).toBe(list.id);
    expect(sharing.ownerUserId).toBe(owner.id);
    expect(sharing.sharedWithUserId).toBe(sharedUser.id);
  });

  test("should check if a list is shared with a user", async () => {
    // Create test users
    const owner = await createUser("owner2@test.com", "password123");
    const sharedUser = await createUser("shared2@test.com", "password123");

    // Create a list
    const list = await createOptionsList({
      name: "Test List 2",
      ownerUserId: owner.id,
    });

    // Initially not shared
    const initiallyShared = await isOptionsListSharedWithUser({
      optionsListId: list.id,
      sharedWithUserId: sharedUser.id,
    });
    expect(initiallyShared).toBe(false);

    // Share the list
    await shareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser.id,
    });

    // Now should be shared
    const nowShared = await isOptionsListSharedWithUser({
      optionsListId: list.id,
      sharedWithUserId: sharedUser.id,
    });
    expect(nowShared).toBe(true);
  });

  test("should get shared lists for a user", async () => {
    // Create test users
    const owner = await createUser("owner3@test.com", "password123");
    const sharedUser = await createUser("shared3@test.com", "password123");

    // Create a list
    const list = await createOptionsList({
      name: "Test List 3",
      ownerUserId: owner.id,
    });

    // Initially no shared lists
    const initiallyShared = await getSharedOptionsListsForUser(sharedUser.id);
    expect(initiallyShared).toHaveLength(0);

    // Share the list
    await shareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser.id,
    });

    // Now should have shared lists
    const nowShared = await getSharedOptionsListsForUser(sharedUser.id);
    expect(nowShared).toHaveLength(1);
    expect(nowShared[0].optionsListId).toBe(list.id);
  });

  test("should get shared users for a list", async () => {
    // Create test users
    const owner = await createUser("owner4@test.com", "password123");
    const sharedUser1 = await createUser("shared4a@test.com", "password123");
    const sharedUser2 = await createUser("shared4b@test.com", "password123");

    // Create a list
    const list = await createOptionsList({
      name: "Test List 4",
      ownerUserId: owner.id,
    });

    // Initially no shared users
    const initiallyShared = await getSharedUsersForOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
    });
    expect(initiallyShared).toHaveLength(0);

    // Share with two users
    await shareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser1.id,
    });
    await shareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser2.id,
    });

    // Now should have shared users
    const nowShared = await getSharedUsersForOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
    });
    expect(nowShared).toHaveLength(2);
    expect(nowShared.map((u) => u.email)).toContain(sharedUser1.email);
    expect(nowShared.map((u) => u.email)).toContain(sharedUser2.email);
  });

  test("should unshare a list", async () => {
    // Create test users
    const owner = await createUser("owner5@test.com", "password123");
    const sharedUser = await createUser("shared5@test.com", "password123");

    // Create a list
    const list = await createOptionsList({
      name: "Test List 5",
      ownerUserId: owner.id,
    });

    // Share the list
    await shareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser.id,
    });

    // Verify it's shared
    const isShared = await isOptionsListSharedWithUser({
      optionsListId: list.id,
      sharedWithUserId: sharedUser.id,
    });
    expect(isShared).toBe(true);

    // Unshare the list
    await unshareOptionsList({
      optionsListId: list.id,
      ownerUserId: owner.id,
      sharedWithUserId: sharedUser.id,
    });

    // Verify it's no longer shared
    const isStillShared = await isOptionsListSharedWithUser({
      optionsListId: list.id,
      sharedWithUserId: sharedUser.id,
    });
    expect(isStillShared).toBe(false);
  });
});
