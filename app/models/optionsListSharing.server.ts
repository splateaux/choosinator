import arc from "@architect/functions";
import { createId } from "@paralleldrive/cuid2";

import { PerformanceMonitor } from "~/utils/performance";

import { OptionsList } from "./optionsList.server";
import { User } from "./user.server";

export interface OptionsListSharing {
  id: ReturnType<typeof createId>;
  optionsListId: OptionsList["id"];
  ownerUserId: User["id"];
  sharedWithUserId: User["id"];
  permission: "view" | "edit";
  createdAt: string;
}

export async function shareOptionsList({
  optionsListId,
  ownerUserId,
  sharedWithUserId,
  permission = "edit",
}: {
  optionsListId: OptionsListSharing["optionsListId"];
  ownerUserId: OptionsListSharing["ownerUserId"];
  sharedWithUserId: OptionsListSharing["sharedWithUserId"];
  permission?: OptionsListSharing["permission"];
}): Promise<OptionsListSharing> {
  return PerformanceMonitor.measureAsync(
    `DB: shareOptionsList(${optionsListId}, ${sharedWithUserId})`,
    async () => {
      const db = await arc.tables();

      const result = await db.optionsListSharing.put({
        optionsListId: optionsListId,
        sharedWithUserId: sharedWithUserId,
        userId: ownerUserId,
        permission,
        createdAt: new Date().toISOString(),
      });

      return {
        id: createId(),
        optionsListId: result.optionsListId,
        ownerUserId: result.userId,
        sharedWithUserId: result.sharedWithUserId,
        permission: result.permission ?? "edit",
        createdAt: result.createdAt,
      };
    },
  );
}

export async function unshareOptionsList({
  optionsListId,
  sharedWithUserId,
}: Pick<
  OptionsListSharing,
  "optionsListId" | "sharedWithUserId"
>): Promise<void> {
  return PerformanceMonitor.measureAsync(
    `DB: unshareOptionsList(${optionsListId}, ${sharedWithUserId})`,
    async () => {
      const db = await arc.tables();

      // With the new table structure, the primary key is optionsListId + sharedWithUserId
      await db.optionsListSharing.delete({
        optionsListId,
        sharedWithUserId,
      });
    },
  );
}

export async function getSharedOptionsListsForUser(
  userId: User["id"],
): Promise<OptionsListSharing[]> {
  return PerformanceMonitor.measureAsync(
    `DB: getSharedOptionsListsForUser(${userId})`,
    async () => {
      const db = await arc.tables();

      // Use the GSI (sharedWithUserId-optionsListId-index) to query by sharedWithUserId
      const results = await db.optionsListSharing.query({
        IndexName: "sharedWithUserId-optionsListId-index",
        KeyConditionExpression: "sharedWithUserId = :sharedWithUserId",
        ExpressionAttributeValues: {
          ":sharedWithUserId": userId,
        },
      });

      return results.Items.map((item) => ({
        id: createId(),
        optionsListId: item.optionsListId,
        ownerUserId: item.userId,
        sharedWithUserId: item.sharedWithUserId,
        permission: item.permission ?? "edit",
        createdAt: item.createdAt,
      }));
    },
  );
}

export async function getSharedUsersForOptionsList({
  optionsListId,
}: Pick<OptionsListSharing, "optionsListId">): Promise<User[]> {
  return PerformanceMonitor.measureAsync(
    `DB: getSharedUsersForOptionsList(${optionsListId})`,
    async () => {
      const db = await arc.tables();

      // Use the base table PK (optionsListId + sharedWithUserId) to get all shares for this list
      const results = await db.optionsListSharing.query({
        KeyConditionExpression: "optionsListId = :optionsListId",
        ExpressionAttributeValues: {
          ":optionsListId": optionsListId,
        },
      });

      // Get user details for each shared user
      const sharedUsers: User[] = [];
      for (const item of results.Items) {
        const user = await import("./user.server").then((m) =>
          m.getUserById(item.sharedWithUserId),
        );
        if (user) {
          sharedUsers.push(user);
        }
      }

      return sharedUsers;
    },
  );
}

export interface OptionsListUserShare {
  user: User;
  permission: "view" | "edit";
}

export async function getUserSharesForOptionsList({
  optionsListId,
}: Pick<OptionsListSharing, "optionsListId">): Promise<
  OptionsListUserShare[]
> {
  return PerformanceMonitor.measureAsync(
    `DB: getUserSharesForOptionsList(${optionsListId})`,
    async () => {
      const db = await arc.tables();

      // Use the base table PK (optionsListId + sharedWithUserId)
      const results = await db.optionsListSharing.query({
        KeyConditionExpression: "optionsListId = :optionsListId",
        ExpressionAttributeValues: {
          ":optionsListId": optionsListId,
        },
      });

      const shares: OptionsListUserShare[] = [];
      for (const item of results.Items) {
        const user = await import("./user.server").then((m) =>
          m.getUserById(item.sharedWithUserId),
        );
        if (user) {
          shares.push({ user, permission: item.permission ?? "edit" });
        }
      }

      return shares;
    },
  );
}

export async function isOptionsListSharedWithUser({
  optionsListId,
  sharedWithUserId,
}: Pick<
  OptionsListSharing,
  "optionsListId" | "sharedWithUserId"
>): Promise<boolean> {
  return PerformanceMonitor.measureAsync(
    `DB: isOptionsListSharedWithUser(${optionsListId}, ${sharedWithUserId})`,
    async () => {
      const db = await arc.tables();

      // Use the GSI (sharedWithUserId-optionsListId-index) to query by sharedWithUserId and optionsListId
      const results = await db.optionsListSharing.query({
        IndexName: "sharedWithUserId-optionsListId-index",
        KeyConditionExpression:
          "sharedWithUserId = :sharedWithUserId AND optionsListId = :optionsListId",
        ExpressionAttributeValues: {
          ":sharedWithUserId": sharedWithUserId,
          ":optionsListId": optionsListId,
        },
      });

      return results.Items.length > 0;
    },
  );
}

export async function getShareRecordForUser({
  optionsListId,
  sharedWithUserId,
}: Pick<OptionsListSharing, "optionsListId" | "sharedWithUserId">): Promise<{
  optionsListId: string;
  ownerUserId: User["id"];
  sharedWithUserId: string;
  permission: "view" | "edit";
  createdAt: string;
} | null> {
  return PerformanceMonitor.measureAsync(
    `DB: getShareRecordForUser(${optionsListId}, ${sharedWithUserId})`,
    async () => {
      const db = await arc.tables();

      // Use the GSI (sharedWithUserId-optionsListId-index) to query by sharedWithUserId + optionsListId
      const results = await db.optionsListSharing.query({
        IndexName: "sharedWithUserId-optionsListId-index",
        KeyConditionExpression:
          "sharedWithUserId = :sharedWithUserId AND optionsListId = :optionsListId",
        ExpressionAttributeValues: {
          ":sharedWithUserId": sharedWithUserId,
          ":optionsListId": optionsListId,
        },
        Limit: 1,
      });

      if (results.Items.length === 0) return null;
      const item = results.Items[0];
      return {
        optionsListId: item.optionsListId,
        ownerUserId: item.userId as User["id"],
        sharedWithUserId: item.sharedWithUserId,
        permission: item.permission ?? "edit",
        createdAt: item.createdAt,
      };
    },
  );
}

export async function isOptionsListEditableByUser({
  optionsListId,
  ownerUserId,
  userId,
}: {
  optionsListId: OptionsList["id"];
  ownerUserId: User["id"];
  userId: User["id"];
}): Promise<boolean> {
  if (ownerUserId === userId) return true;
  const record = await getShareRecordForUser({
    optionsListId,
    sharedWithUserId: userId,
  });
  return record?.permission === "edit";
}
export async function updateSharePermission({
  optionsListId,
  ownerUserId,
  sharedWithUserId,
  permission,
}: Pick<
  OptionsListSharing,
  "optionsListId" | "ownerUserId" | "sharedWithUserId" | "permission"
>): Promise<void> {
  return PerformanceMonitor.measureAsync(
    `DB: updateSharePermission(${optionsListId}, ${sharedWithUserId}, ${permission})`,
    async () => {
      const db = await arc.tables();

      // With the new table structure, the primary key is optionsListId + sharedWithUserId
      await db.optionsListSharing.put({
        optionsListId,
        sharedWithUserId,
        userId: ownerUserId,
        permission,
        createdAt: new Date().toISOString(), // Update the timestamp
      });
    },
  );
}
