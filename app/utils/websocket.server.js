// Common TTL calculation for WebSocket connections (30 minutes)
export const WEBSOCKET_TTL_SECONDS = 60 * 30;

export function calculateWebSocketTTL() {
    return Math.floor(Date.now() / 1000) + WEBSOCKET_TTL_SECONDS;
}

// Common function to store poll connection
export async function storePollConnection(
    pollId,
    connectionId,
    userId,
    domainName,
    stage
) {
    const arc = (await import("@architect/functions")).default;
    const db = await arc.tables();
    const ttl = calculateWebSocketTTL();

    await db.pollConnections.put({
        pk: `POLL#${pollId}`,
        sk: `CONN#${connectionId}`,
        userId,
        domainName,
        stage,
        ttl,
    });
}

// Common runtime configuration for WebSocket handlers
export const WEBSOCKET_CONFIG = { runtime: "nodejs18.x" };
