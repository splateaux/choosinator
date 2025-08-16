import {
  storePollConnection,
  WEBSOCKET_CONFIG,
} from "../../app/utils/websocket.server.js";

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

export const config = WEBSOCKET_CONFIG;
