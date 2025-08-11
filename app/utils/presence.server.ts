export interface ParticipantPresence {
    clientId: string;
    displayName: string;
    lastSeenAt: number; // epoch ms
}

const PRESENCE_TTL_MS = 30_000; // 30s

// In-memory presence store keyed by pollId then clientId
const presenceByPoll = new Map<string, Map<string, ParticipantPresence>>();

function getNow(): number {
    return Date.now();
}

function ensurePollMap(pollId: string): Map<string, ParticipantPresence> {
    let pollMap = presenceByPoll.get(pollId);
    if (!pollMap) {
        pollMap = new Map();
        presenceByPoll.set(pollId, pollMap);
    }
    return pollMap;
}

function pruneExpiredForPoll(pollId: string): void {
    const pollMap = presenceByPoll.get(pollId);
    if (!pollMap) return;
    const cutoff = getNow() - PRESENCE_TTL_MS;
    for (const [clientId, presence] of pollMap.entries()) {
        if (presence.lastSeenAt < cutoff) {
            pollMap.delete(clientId);
        }
    }
    if (pollMap.size === 0) {
        presenceByPoll.delete(pollId);
    }
}

export function updatePresence(
    pollId: string,
    clientId: string,
    displayName: string,
): ParticipantPresence {
    const pollMap = ensurePollMap(pollId);
    const now = getNow();
    const existing = pollMap.get(clientId);
    const updated: ParticipantPresence = {
        clientId,
        displayName: displayName.trim() || "Anonymous",
        lastSeenAt: now,
    };
    if (existing) {
        existing.lastSeenAt = now;
        existing.displayName = updated.displayName;
        pollMap.set(clientId, existing);
        pruneExpiredForPoll(pollId);
        return existing;
    }
    pollMap.set(clientId, updated);
    pruneExpiredForPoll(pollId);
    return updated;
}

export function listPresence(
    pollId: string,
): Pick<ParticipantPresence, "clientId" | "displayName">[] {
    pruneExpiredForPoll(pollId);
    const pollMap = presenceByPoll.get(pollId);
    if (!pollMap) return [];
    return Array.from(pollMap.values())
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((p) => ({ clientId: p.clientId, displayName: p.displayName }));
}

export function countPresence(pollId: string): number {
    pruneExpiredForPoll(pollId);
    return presenceByPoll.get(pollId)?.size ?? 0;
}


