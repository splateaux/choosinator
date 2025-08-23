import { createId } from "@paralleldrive/cuid2";

import { getAzureDatabase } from "~/lib/azure-db.server";
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
  const db = getAzureDatabase();
  const result = await db.query<OptionItem>(
    "option",
    "SELECT * FROM c WHERE c.optionsListId = @optionsListId",
    [{ name: "@optionsListId", value: optionsListId }],
  );

  const conflictingOption = result.find(
    (item) =>
      item.name?.toLowerCase() === name.toLowerCase() &&
      item.id !== excludeOptionId,
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
      const db = getAzureDatabase();
      const result = await db.query<OptionItem>(
        "option",
        "SELECT * FROM c WHERE c.optionsListId = @optionsListId",
        [{ name: "@optionsListId", value: optionsListId }],
      );

      const items: OptionItem[] = result.map((row) => ({
        id: row.id,
        optionsListId: row.optionsListId,
        name: row.name ?? "",
        description: row.description ?? "",
      }));

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

  const db = getAzureDatabase();
  const optionId = createId();

  const result = await db.put("option", {
    id: optionId,
    optionsListId,
    name,
    description,
  });

  return {
    id: result.id,
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
  const db = getAzureDatabase();

  // Read current
  const current = await db.get<OptionItem>("option", id, optionsListId);
  if (!current) return null;

  if (name) {
    await checkOptionNameConflict(optionsListId, name, id);
  }

  const next = {
    ...current,
    name: name ?? current.name,
    description: description ?? current.description ?? "",
  };

  const result = await db.put("option", next);
  return {
    id: result.id,
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
  const db = getAzureDatabase();
  await db.delete("option", id, optionsListId);
}
