// WebSocket default handler with inline utilities
import arc from "@architect/functions";

// Inline utility functions to avoid module bundling issues
const WEBSOCKET_TTL_SECONDS = 60 * 30;

function calculateWebSocketTTL() {
  return Math.floor(Date.now() / 1000) + WEBSOCKET_TTL_SECONDS;
}

async function storePollConnection(pollId, connectionId, userId, domainName, stage) {
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

export async function handler(req) {
  const { connectionId } = req.requestContext;
  let body = {};
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    // ignore
  }
  console.log(
    `WebSocket message received: connectionId=${connectionId}, body=`,
    body,
  );

  if (body.type === "subscribe" && body.pollId) {
    await storePollConnection(
      body.pollId,
      connectionId,
      body.userId || "guest",
      req.requestContext.domainName,
      req.requestContext.stage,
    );
    console.log(
      `Client subscribed to poll ${body.pollId}: connectionId=${connectionId}, userId=${body.userId || "guest"}`,
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 200 };
}

export const config = { runtime: "nodejs18.x" };
