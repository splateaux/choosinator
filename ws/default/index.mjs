import arc from "@architect/functions";

export async function handler(req) {
  const { connectionId } = req.requestContext;
  let body = {};
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    // ignore
  }
  console.log("MORTON - ws/default/index.mjs");
  console.log(
    `WebSocket message received: connectionId=${connectionId}, body=`,
    body,
  );

  if (body.type === "subscribe" && body.pollId) {
    const db = await arc.tables();
    const ttl = Math.floor(Date.now() / 1000) + 60 * 30;
    await db.pollConnections.put({
      pk: `POLL#${body.pollId}`,
      sk: `CONN#${connectionId}`,
      userId: body.userId || "guest",
      domainName: req.requestContext.domainName,
      stage: req.requestContext.stage,
      ttl,
    });
    console.log(
      `Client subscribed to poll ${body.pollId}: connectionId=${connectionId}, userId=${body.userId || "guest"}`,
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 200 };
}

export const config = { runtime: "nodejs18.x" };
