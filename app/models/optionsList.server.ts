import arc from "@architect/functions";
import { createId } from "@paralleldrive/cuid2";

import { PerformanceMonitor } from "~/utils/performance";

import { User } from "./user.server";

export interface OptionsList {
  id: ReturnType<typeof createId>;
  name: string;
  ownerUserId: User["id"];
}

export interface SharedOptionsList extends OptionsList {
  permission: "view" | "edit";
}

export async function getOptionsList({
  id,
  ownerUserId,
}: Pick<OptionsList, "id" | "ownerUserId">): Promise<OptionsList | null> {
  return PerformanceMonitor.measureAsync(
    `DB: getOptionsList(${id})`,
    async () => {
      const db = await arc.tables();
      const result = await db.optionsList.get({
        userId: ownerUserId,
        optionsListId: id,
      });

      if (result) {
        return {
          ownerUserId: result.userId,
          id: result.optionsListId,
          name: result.name,
        };
      }
      return null;
    },
  );
}

export async function getOptionsListForUser({
  id,
  userId,
}: {
  id: OptionsList["id"];
  userId: User["id"];
}): Promise<OptionsList | SharedOptionsList | null> {
  return PerformanceMonitor.measureAsync(
    `DB: getOptionsListForUser(${id}, ${userId})`,
    async () => {
      // First try to get as owner
      const db = await arc.tables();
      const result = await db.optionsList.get({
        userId: userId,
        optionsListId: id,
      });

      if (result) {
        return {
          ownerUserId: result.userId,
          id: result.optionsListId,
          name: result.name,
        };
      }

      // If not found as owner, check if shared
      const { getShareRecordForUser } = await import(
        "./optionsListSharing.server"
      );
      const shareRecord = await getShareRecordForUser({
        optionsListId: id,
        sharedWithUserId: userId,
      });

      if (shareRecord) {
        // Find the owner by querying all lists with this ID
        const allResults = await db.optionsList.query({
          IndexName: "optionsListId-index",
          KeyConditionExpression: "optionsListId = :optionsListId",
          ExpressionAttributeValues: {
            ":optionsListId": id,
          },
        });

        if (allResults.Items.length > 0) {
          const listData = allResults.Items[0];
          return {
            ownerUserId: listData.userId,
            id: listData.optionsListId,
            name: listData.name,
            permission: shareRecord.permission,
          };
        }
      }

      return null;
    },
  );
}

export async function getOptionsListsByOwner(
  ownerUserId: User["id"],
): Promise<OptionsList[]> {
  return PerformanceMonitor.measureAsync(
    `DB: getOptionsListsByOwner(${ownerUserId})`,
    async () => {
      const db = await arc.tables();

      const results = await db.optionsList.query({
        KeyConditionExpression: "userId = :ownerUserId",
        ExpressionAttributeValues: {
          ":ownerUserId": ownerUserId,
        },
      });

      return results.Items.map((item) => ({
        id: item.optionsListId,
        ownerUserId: item.userId,
        name: item.name,
      }));
    },
  );
}

export async function getOptionsListsForUser(
  userId: User["id"],
): Promise<{ owned: OptionsList[]; shared: SharedOptionsList[] }> {
  return PerformanceMonitor.measureAsync(
    `DB: getOptionsListsForUser(${userId})`,
    async () => {
      // Get owned lists
      const owned = await getOptionsListsByOwner(userId);

      // Get shared lists
      const { getSharedOptionsListsForUser } = await import(
        "./optionsListSharing.server"
      );
      const sharedSharingRecords = await getSharedOptionsListsForUser(userId);

      const shared: SharedOptionsList[] = [];
      for (const sharingRecord of sharedSharingRecords) {
        const list = await getOptionsList({
          id: sharingRecord.optionsListId,
          ownerUserId: sharingRecord.ownerUserId,
        });
        if (list) {
          shared.push({
            ...list,
            permission: sharingRecord.permission,
          });
        }
      }

      return { owned, shared };
    },
  );
}

export async function createOptionsList({
  name,
  ownerUserId,
}: Pick<OptionsList, "name" | "ownerUserId">): Promise<OptionsList> {
  const db = await arc.tables();

  const result = await db.optionsList.put({
    userId: ownerUserId,
    optionsListId: createId(),
    name: name,
  });
  return {
    id: result.optionsListId,
    ownerUserId: result.userId,
    name: result.name,
  };
}

export async function deleteOptionsList({
  id,
  ownerUserId,
}: Pick<OptionsList, "id" | "ownerUserId">) {
  const db = await arc.tables();
  return db.optionsList.delete({ userId: ownerUserId, optionsListId: id });
}
