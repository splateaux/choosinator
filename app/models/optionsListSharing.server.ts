import { createId } from "@paralleldrive/cuid2";

import { getAzureDatabase } from "~/lib/azure-db.server";
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
      const db = getAzureDatabase();
      const shareId = `${optionsListId}#${sharedWithUserId}`;

      const result = await db.put("optionsListSharing", {
        id: shareId,
        optionsListId: optionsListId,
        sharedWithUserId: sharedWithUserId,
        ownerUserId: ownerUserId,
        permission,
        createdAt: new Date().toISOString(),
      });

      return {
        id: createId(),
        optionsListId: result.optionsListId,
        ownerUserId: result.ownerUserId,
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
      const db = getAzureDatabase();
      const shareId = `${optionsListId}#${sharedWithUserId}`;

      await db.delete("optionsListSharing", shareId, optionsListId);
    },
  );
}

export async function getSharedOptionsListsForUser(
  userId: User["id"],
): Promise<OptionsListSharing[]> {
  return PerformanceMonitor.measureAsync(
    `DB: getSharedOptionsListsForUser(${userId})`,
    async () => {
      const db = getAzureDatabase();

      const results = await db.query<{
        id: string;
        optionsListId: string;
        ownerUserId: string;
        sharedWithUserId: string;
        permission: string;
        createdAt: string;
      }>(
        "optionsListSharing",
        "SELECT * FROM c WHERE c.sharedWithUserId = @sharedWithUserId",
        [{ name: "@sharedWithUserId", value: userId }],
      );

      return results.map((item) => ({
        id: createId(),
        optionsListId: item.optionsListId,
        ownerUserId: item.ownerUserId as `email#${string}`,
        sharedWithUserId: item.sharedWithUserId as `email#${string}`,
        permission: (item.permission as "view" | "edit") ?? "edit",
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
      const db = getAzureDatabase();

      const results = await db.query<{
        sharedWithUserId: string;
      }>(
        "optionsListSharing",
        "SELECT c.sharedWithUserId FROM c WHERE c.optionsListId = @optionsListId",
        [{ name: "@optionsListId", value: optionsListId }],
      );

      // Get user details for each shared user
      const sharedUsers: User[] = [];
      for (const item of results) {
        const user = await import("./user.server").then((m) =>
          m.getUserById(item.sharedWithUserId as `email#${string}`),
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
}: Pick<OptionsListSharing, "optionsListId">): Promise<OptionsListUserShare[]> {
  return PerformanceMonitor.measureAsync(
    `DB: getUserSharesForOptionsList(${optionsListId})`,
    async () => {
      const db = getAzureDatabase();

      const results = await db.query<{
        sharedWithUserId: string;
        permission: string;
      }>(
        "optionsListSharing",
        "SELECT c.sharedWithUserId, c.permission FROM c WHERE c.optionsListId = @optionsListId",
        [{ name: "@optionsListId", value: optionsListId }],
      );

      const shares: OptionsListUserShare[] = [];
      for (const item of results) {
        const user = await import("./user.server").then((m) =>
          m.getUserById(item.sharedWithUserId as `email#${string}`),
        );
        if (user) {
          shares.push({
            user,
            permission: (item.permission as "view" | "edit") ?? "edit",
          });
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
      const db = getAzureDatabase();

      const results = await db.query<{ id: string }>(
        "optionsListSharing",
        "SELECT c.id FROM c WHERE c.sharedWithUserId = @sharedWithUserId AND c.optionsListId = @optionsListId",
        [
          { name: "@sharedWithUserId", value: sharedWithUserId },
          { name: "@optionsListId", value: optionsListId },
        ],
      );

      return results.length > 0;
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
      const db = getAzureDatabase();

      const results = await db.query<{
        optionsListId: string;
        ownerUserId: string;
        sharedWithUserId: string;
        permission: string;
        createdAt: string;
      }>(
        "optionsListSharing",
        "SELECT * FROM c WHERE c.sharedWithUserId = @sharedWithUserId AND c.optionsListId = @optionsListId",
        [
          { name: "@sharedWithUserId", value: sharedWithUserId },
          { name: "@optionsListId", value: optionsListId },
        ],
      );

      if (results.length === 0) return null;
      const item = results[0];
      return {
        optionsListId: item.optionsListId,
        ownerUserId: item.ownerUserId as User["id"],
        sharedWithUserId: item.sharedWithUserId,
        permission: (item.permission as "view" | "edit") ?? "edit",
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
      const db = getAzureDatabase();
      const shareId = `${optionsListId}#${sharedWithUserId}`;

      await db.put("optionsListSharing", {
        id: shareId,
        optionsListId,
        sharedWithUserId,
        ownerUserId,
        permission,
        createdAt: new Date().toISOString(), // Update the timestamp
      });
    },
  );
}
