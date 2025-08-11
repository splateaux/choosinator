import arc from "@architect/functions";

export interface PresenceRecord {
    pollId: string;
    clientId: string;
    displayName: string;
    lastSeenAt: number;
}

const TTL_SECONDS = 45; // Dynamo TTL grace window in seconds

function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

export async function upsertPresence(
    pollId: string,
    clientId: string,
    displayName: string,
): Promise<void> {
    const db = await arc.tables();
    const lastSeenAt = Date.now();
    await db.pollPresence.put({
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
    const db = await arc.tables();
    const result = await db.pollPresence.query({
        KeyConditionExpression: "pollId = :pollId",
        ExpressionAttributeValues: { ":pollId": pollId },
    });
    const cutoff = Date.now() - 30_000; // 30s activity window
    interface PresenceRow {
        clientId?: string;
        displayName?: string;
        lastSeenAt?: number;
    }
    const rows: PresenceRow[] = (result.Items || []) as PresenceRow[];
    return rows
        .filter((r) => (r.lastSeenAt ?? 0) >= cutoff)
        .map((r) => ({ clientId: r.clientId ?? "", displayName: r.displayName ?? "" }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
}


