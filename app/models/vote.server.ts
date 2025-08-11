import arc from "@architect/functions";

export interface VoteRecord {
  pk: string; // POLL#<pollId>
  sk: string; // VOTE#<optionId>#<userId>
  userId: string;
  optionId: string;
  tokens?: number; // number of tokens the user allocated to the option
  updatedAt: string;
}

export const MAX_TOKENS_PER_USER = 10;

/**
 * Adjust a user's token allocation for a specific option in a poll by delta (+1 or -1).
 * Enforces that the user may allocate at most MAX_TOKENS_PER_USER tokens across all options
 * in the poll, and at least 0 tokens for the specific option.
 */
export async function adjustVoteTokens({
  pollId,
  userId,
  optionId,
  delta,
  maxTokens = MAX_TOKENS_PER_USER,
}: {
  pollId: string;
  userId: string;
  optionId: string;
  delta: number; // typically +1 or -1
  maxTokens?: number;
}): Promise<{ newCount: number; remaining: number }> {
  const db = await arc.tables();
  const pk = `POLL#${pollId}`;
  const sk = `VOTE#${optionId}#${userId}`;

  // Load all votes for this poll to compute current totals for this user
  const all = await db.pollVote.query({
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": pk },
  });
  interface Row {
    sk?: string;
    userId?: string;
    optionId?: string;
    tokens?: number;
  }
  const myRows: Row[] = (all.Items || []).filter(
    (r: Row) => (r.userId ?? "") === userId,
  );
  const currentTotalAllocated = myRows.reduce(
    (sum, r) => sum + (typeof r.tokens === "number" ? r.tokens : 0),
    0,
  );

  // Get the current record for this specific option
  const existing = (await db.pollVote.get({ pk, sk })) as VoteRecord | null;
  const currentOptionCount = existing?.tokens ?? 0;

  let desired = currentOptionCount + delta;
  if (desired < 0) desired = 0;

  const remainingBefore = Math.max(0, maxTokens - currentTotalAllocated);
  if (delta > 0 && remainingBefore === 0) {
    return { newCount: currentOptionCount, remaining: 0 };
  }

  // Cap desired so we don't exceed overall max
  const maxAdd = remainingBefore + currentOptionCount; // you may move tokens within options
  if (desired > maxAdd) desired = maxAdd;

  // If unchanged, short-circuit
  if (desired === currentOptionCount) {
    return {
      newCount: currentOptionCount,
      remaining: Math.max(0, maxTokens - currentTotalAllocated),
    };
  }

  const now = new Date().toISOString();
  await db.pollVote.put({
    pk,
    sk,
    userId,
    optionId,
    tokens: desired,
    updatedAt: now,
  });

  // Recompute remaining with new desired value
  const newTotal = currentTotalAllocated - currentOptionCount + desired;
  const remaining = Math.max(0, maxTokens - newTotal);
  return { newCount: desired, remaining };
}

export interface PollVotesSummary {
  byOption: Record<
    string,
    {
      total: number;
      byUser: Record<string, number>;
    }
  >;
  totalsByUser: Record<string, number>;
}

/**
 * Returns a breakdown of tokens by option and by user for an entire poll.
 */
export async function getVotesForPoll(
  pollId: string,
): Promise<PollVotesSummary> {
  const db = await arc.tables();
  const pk = `POLL#${pollId}`;
  const result = await db.pollVote.query({
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": pk },
  });

  interface Row {
    optionId?: string;
    userId?: string;
    tokens?: number;
  }
  const summary: PollVotesSummary = { byOption: {}, totalsByUser: {} };
  for (const row of (result.Items || []) as Row[]) {
    const optionId = row.optionId ?? "";
    const userId = row.userId ?? "";
    const tokens = typeof row.tokens === "number" ? row.tokens : 0;
    if (!summary.byOption[optionId]) {
      summary.byOption[optionId] = { total: 0, byUser: {} };
    }
    summary.byOption[optionId].byUser[userId] = tokens;
    summary.byOption[optionId].total += tokens;
    summary.totalsByUser[userId] = (summary.totalsByUser[userId] || 0) + tokens;
  }

  return summary;
}
