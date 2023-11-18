import arc from "@architect/functions";
import { createId } from "@paralleldrive/cuid2";

import { User } from "./user.server";

export interface OptionsList {
  id: ReturnType<typeof createId>;
  name: string;
  ownerUserId: User["id"];
}

export async function getOptionsList({
  id,
  ownerUserId,
}: Pick<OptionsList, "id" | "ownerUserId">): Promise<OptionsList | null> {
  const db = await arc.tables();
  const result = await db.optionsList.get({ userId: ownerUserId, optionsListId: id });

  if (result) {
    return {
      ownerUserId: result.userId,
      id: result.optionsListId,
      name: result.name,
    };
  }
  return null;
}

export async function getOptionsListsByOwner(
  ownerUserId: string,
): Promise<OptionsList[]> {
  const db = await arc.tables();

  const results = await db.optionsList.query({
    KeyConditionExpression: 'userId = :ownerUserId',
    ExpressionAttributeValues: {
      ':ownerUserId': ownerUserId,
    },
  });

  return results.Items.map((item) => ({
    id: item.optionsListId,
    ownerUserId: item.userId,
    name: item.name,
  }));
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
  return db.note.delete({ userId: ownerUserId, optionsListId: id });
}
