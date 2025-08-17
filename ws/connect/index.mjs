// WebSocket connect handler with inline utilities
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
  try {
    // Debug: Log all environment variables
    console.log("🔍 [DEBUG] Environment variables:", {
      WS_URL: process.env.WS_URL,
      ARC_ENV: process.env.ARC_ENV,
      NODE_ENV: process.env.NODE_ENV,
      ALL_ENV: Object.keys(process.env).filter(key => key.includes('WS') || key.includes('URL'))
    });

    const { connectionId, domainName, stage } = req.requestContext;
    // Optional: authenticate via queryStringParameters or headers
    const pollId = req.queryStringParameters?.pollId;
    const userId = req.queryStringParameters?.userId || "guest";

    console.log(
      `WebSocket connection received: connectionId=${connectionId}, pollId=${pollId}, userId=${userId}`,
    );

    if (!pollId) {
      console.log(
        `WebSocket connection rejected: Missing pollId for connectionId=${connectionId}`,
      );
      return { statusCode: 400, body: "Missing pollId" };
    }

    await storePollConnection(pollId, connectionId, userId, domainName, stage);

    console.log(
      `WebSocket connection stored: pollId=${pollId}, userId=${userId}, connectionId=${connectionId}`,
    );

    return { statusCode: 200, body: "connected" };
  } catch (error) {
    console.error("WebSocket connect handler error:", error);
    return { statusCode: 500, body: "Internal server error" };
  }
}

export const config = { runtime: "nodejs18.x" };
