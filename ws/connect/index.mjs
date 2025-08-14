import { storePollConnection, WEBSOCKET_CONFIG } from "../../app/utils/websocket.server.js";

export async function handler(req) {
  try {
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

export const config = WEBSOCKET_CONFIG;
