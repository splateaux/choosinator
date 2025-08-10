import arc from "@architect/functions";
import { createId } from "@paralleldrive/cuid2";

import { PerformanceMonitor } from "~/utils/performance";

export interface OptionItem {
  id: ReturnType<typeof createId>;
  optionsListId: string;
  name: string;
  description: string;
}

export class OptionNameConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptionNameConflictError";
  }
}

async function checkOptionNameConflict(
  optionsListId: string,
  name: string,
  excludeOptionId?: string,
): Promise<void> {
  const db = await arc.tables();
  const result = await db.option.query({
    KeyConditionExpression: "optionsListId = :optionsListId",
    ExpressionAttributeValues: {
      ":optionsListId": optionsListId,
    },
  });

  const conflictingOption = (result.Items || []).find(
    (item) =>
      item.name?.toLowerCase() === name.toLowerCase() &&
      item.optionId !== excludeOptionId,
  );

  if (conflictingOption) {
    throw new OptionNameConflictError(
      `An option with the name "${name}" already exists in this list.`,
    );
  }
}

export async function getOptionsForList(
  optionsListId: string,
): Promise<OptionItem[]> {
  return PerformanceMonitor.measureAsync(
    `DB: getOptionsForList(${optionsListId})`,
    async () => {
      const db = await arc.tables();
      const result = await db.option.query({
        KeyConditionExpression: "optionsListId = :optionsListId",
        ExpressionAttributeValues: {
          ":optionsListId": optionsListId,
        },
      });

      interface DynamoOptionRow {
        optionId: string;
        optionsListId: string;
        name?: string;
        description?: string;
      }
      const items: OptionItem[] = (result.Items || []).map(
        (row: DynamoOptionRow) => ({
          id: row.optionId,
          optionsListId: row.optionsListId,
          name: row.name ?? "",
          description: row.description ?? "",
        }),
      );

      // Sort by name ascending as required
      items.sort((a, b) => a.name.localeCompare(b.name));
      return items;
    },
  );
}

export async function createOption({
  optionsListId,
  name,
  description,
}: Pick<
  OptionItem,
  "optionsListId" | "name" | "description"
>): Promise<OptionItem> {
  await checkOptionNameConflict(optionsListId, name);

  const db = await arc.tables();
  const optionId = createId();

  const result = await db.option.put({
    optionsListId,
    optionId,
    name,
    description,
  });

  return {
    id: result.optionId,
    optionsListId: result.optionsListId,
    name: result.name,
    description: result.description ?? "",
  } as OptionItem;
}

export async function updateOption({
  optionsListId,
  id,
  name,
  description,
}: {
  optionsListId: string;
  id: string;
  name?: string;
  description?: string;
}): Promise<OptionItem | null> {
  const db = await arc.tables();

  // Read current
  const current = await db.option.get({ optionsListId, optionId: id });
  if (!current) return null;

  if (name) {
    await checkOptionNameConflict(optionsListId, name, id);
  }

  const next = {
    ...current,
    name: name ?? current.name,
    description: description ?? current.description ?? "",
  };

  const result = await db.option.put(next);
  return {
    id: result.optionId,
    optionsListId: result.optionsListId,
    name: result.name,
    description: result.description ?? "",
  } as OptionItem;
}

export async function deleteOption({
  optionsListId,
  id,
}: {
  optionsListId: string;
  id: string;
}): Promise<void> {
  const db = await arc.tables();
  await db.option.delete({ optionsListId, optionId: id });
}
