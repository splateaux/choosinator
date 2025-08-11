import arc from "@architect/functions";
import { createId } from "@paralleldrive/cuid2";

import type { OptionsList } from "./optionsList.server";
import type { User } from "./user.server";

export interface Poll {
  id: string;
  optionsListId: OptionsList["id"];
  name: string;
  createdByUserId: User["id"]; // can be empty string for guest-created if needed later
  createdAt: string;
}

export async function createPoll({
  optionsListId,
  name,
  createdByUserId,
}: Pick<Poll, "optionsListId" | "name" | "createdByUserId">): Promise<Poll> {
  const db = await arc.tables();
  const nowIso = new Date().toISOString();
  const pollId = createId();

  const result = await db.poll.put({
    pollId,
    optionsListId,
    name,
    createdByUserId,
    createdAt: nowIso,
  });

  return {
    id: result.pollId,
    optionsListId: result.optionsListId,
    name: result.name,
    createdByUserId: result.createdByUserId,
    createdAt: result.createdAt,
  };
}

export async function getPollById(pollId: Poll["id"]): Promise<Poll | null> {
  const db = await arc.tables();
  const result = await db.poll.get({ pollId });
  if (!result) return null;
  return {
    id: result.pollId,
    optionsListId: result.optionsListId,
    name: result.name,
    createdByUserId: result.createdByUserId,
    createdAt: result.createdAt,
  };
}

export async function listPollsForOptionsList(
  optionsListId: OptionsList["id"],
): Promise<Poll[]> {
  // There is no secondary index; we'll scan and filter in memory for simplicity at MVP scale
  const db = await arc.tables();
  const results = await db.poll.scan({});

  interface DynamoPollRow {
    pollId: string;
    optionsListId: string;
    name: string;
    createdByUserId: string;
    createdAt: string;
  }

  const items: DynamoPollRow[] = (results.Items || []) as DynamoPollRow[];
  const filtered = items.filter((row) => row.optionsListId === optionsListId);
  filtered.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt));
  return filtered.map((row) => ({
    id: row.pollId,
    optionsListId: row.optionsListId,
    name: row.name,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  }));
}
