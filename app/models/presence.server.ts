import { getAzureDatabase } from "~/lib/azure-db.server";

export interface PresenceRecord {
  id: string; // pollId#clientId
  pollId: string;
  clientId: string;
  displayName: string;
  lastSeenAt: number;
  ttl: number;
}

const TTL_SECONDS = 45; // Cosmos DB TTL grace window in seconds

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function upsertPresence(
  pollId: string,
  clientId: string,
  displayName: string,
): Promise<void> {
  const db = getAzureDatabase();
  const lastSeenAt = Date.now();
  const id = `${pollId}#${clientId}`;

  await db.put("pollPresence", {
    id,
    pollId,
    clientId,
    displayName,
    lastSeenAt,
    ttl: nowSeconds() + TTL_SECONDS,
  });
}

export async function listPresenceForPoll(
  pollId: string,
): Promise<Pick<PresenceRecord, "clientId" | "displayName">[]> {
  const db = getAzureDatabase();
  const result = await db.query<PresenceRecord>(
    "pollPresence",
    "SELECT * FROM c WHERE c.pollId = @pollId",
    [{ name: "@pollId", value: pollId }],
  );

  const cutoff = Date.now() - 30_000; // 30s activity window

  return result
    .filter((r) => (r.lastSeenAt ?? 0) >= cutoff)
    .map((r) => ({
      clientId: r.clientId ?? "",
      displayName: r.displayName ?? "",
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
