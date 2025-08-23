import { createId } from "@paralleldrive/cuid2";

import { getAzureDatabase } from "~/lib/azure-db.server";
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
      const db = getAzureDatabase();
      const result = await db.get<OptionsList>("optionsList", id, ownerUserId);

      if (result) {
        return {
          ownerUserId: result.ownerUserId,
          id: result.id,
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
      const db = getAzureDatabase();
      const result = await db.get<OptionsList>("optionsList", id, userId);

      if (result) {
        return {
          ownerUserId: result.ownerUserId,
          id: result.id,
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
        // We have the owner from the share record; fetch the list directly by base table PK
        const ownedList = await getOptionsList({
          id,
          ownerUserId: shareRecord.ownerUserId,
        });
        if (ownedList) {
          return { ...ownedList, permission: shareRecord.permission };
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
      const db = getAzureDatabase();

      const results = await db.query<OptionsList>(
        "optionsList",
        "SELECT * FROM c WHERE c.ownerUserId = @ownerUserId",
        [{ name: "@ownerUserId", value: ownerUserId }],
      );

      return results.map((item) => ({
        id: item.id,
        ownerUserId: item.ownerUserId,
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
  const db = getAzureDatabase();

  const result = await db.put("optionsList", {
    id: createId(),
    ownerUserId: ownerUserId,
    name: name,
  });
  return {
    id: result.id,
    ownerUserId: result.ownerUserId,
    name: result.name,
  };
}

export async function deleteOptionsList({
  id,
  ownerUserId,
}: Pick<OptionsList, "id" | "ownerUserId">) {
  const db = getAzureDatabase();
  return db.delete("optionsList", id, ownerUserId);
}
