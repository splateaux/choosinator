import { createId } from "@paralleldrive/cuid2";

import { getAzureDatabase } from "~/lib/azure-db.server";

import type { OptionsList } from "./optionsList.server";

export interface Poll {
  id: string;
  optionsListId: OptionsList["id"];
  name: string;
  createdByUserId: string; // user id like `email#...` or empty for guests
  createdAt: string;
}

export async function createPoll({
  optionsListId,
  name,
  createdByUserId,
}: Pick<Poll, "optionsListId" | "name" | "createdByUserId">): Promise<Poll> {
  const db = getAzureDatabase();
  const nowIso = new Date().toISOString();
  const pollId = createId();

  const result = await db.put("poll", {
    id: pollId,
    optionsListId,
    name,
    createdByUserId,
    createdAt: nowIso,
  });

  return {
    id: result.id,
    optionsListId: result.optionsListId,
    name: result.name,
    createdByUserId: result.createdByUserId,
    createdAt: result.createdAt,
  };
}

export async function getPollById(pollId: Poll["id"]): Promise<Poll | null> {
  const db = getAzureDatabase();
  const result = await db.get<Poll>("poll", pollId);
  if (!result) return null;
  return result;
}

export async function listPollsForOptionsList(
  optionsListId: OptionsList["id"],
): Promise<Poll[]> {
  const db = getAzureDatabase();
  const results = await db.query<Poll>(
    "poll",
    "SELECT * FROM c WHERE c.optionsListId = @optionsListId ORDER BY c.createdAt",
    [{ name: "@optionsListId", value: optionsListId }],
  );

  return results;
}
