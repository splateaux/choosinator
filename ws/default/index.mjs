import arc from "@architect/functions";

export async function handler(req) {
    const { connectionId } = req.requestContext;
    let body = {};
    try {
        body = JSON.parse(req.body || "{}");
    } catch {
        // ignore
    }

    if (body.type === "subscribe" && body.pollId) {
        const db = await arc.tables();
        const ttl = Math.floor(Date.now() / 1000) + 60 * 30;
        await db.pollConnections.put({
            pk: `POLL#${body.pollId}`,
            sk: `CONN#${connectionId}`,
            userId: body.userId || "guest",
            ttl,
        });
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 200 };
}

export const config = { runtime: "nodejs18.x" };


