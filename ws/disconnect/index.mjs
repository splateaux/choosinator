import arc from "@architect/functions";

export async function handler(req) {
    const { connectionId } = req.requestContext;
    const db = await arc.tables();
    const idx = await db.pollConnections.query({
        IndexName: "sk-pk-index",
        KeyConditionExpression: "sk = :sk",
        ExpressionAttributeValues: { ":sk": `CONN#${connectionId}` },
    });

    const deletes = (idx.Items || []).map((item) =>
        db.pollConnections.delete({ pk: item.pk, sk: item.sk }),
    );
    await Promise.allSettled(deletes);
    return { statusCode: 200 };
}

export const config = { runtime: "nodejs18.x" };


