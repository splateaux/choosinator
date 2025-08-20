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
  stage,
) {
  const arc = (await import("@architect/functions")).default;
  const db = await arc.tables();
  const ttl = calculateWebSocketTTL();

  const connectionRecord = {
    pk: `POLL#${pollId}`,
    sk: `CONN#${connectionId}`,
    pollId,
    connectionId,
    userId,
    domainName,
    stage,
    ttl,
  };

  try {
    await db.pollConnections.put(connectionRecord);
  } catch (error) {
    console.error("Failed to store connection record:", error);
    throw error;
  }
}

// Common runtime configuration for WebSocket handlers
export const WEBSOCKET_CONFIG = { runtime: "nodejs18.x" };
