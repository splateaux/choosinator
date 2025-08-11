import arc from "@architect/functions";

export async function handler(req) {
    const { connectionId, domainName, stage } = req.requestContext;
    // Optional: authenticate via queryStringParameters or headers
    const pollId = req.queryStringParameters?.pollId;
    const userId = req.queryStringParameters?.userId || "guest";

    if (!pollId) {
        return { statusCode: 400, body: "Missing pollId" };
    }

    const db = await arc.tables();
    const ttl = Math.floor(Date.now() / 1000) + 60 * 30; // 30 minutes
    await db.pollConnections.put({
        pk: `POLL#${pollId}`,
        sk: `CONN#${connectionId}`,
        userId,
        domainName,
        stage,
        ttl,
    });

    return { statusCode: 200, body: "connected" };
}

export const config = { runtime: "nodejs18.x" };


