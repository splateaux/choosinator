import arc from "@architect/functions";
import aws from "aws-sdk";

function getManagementClient(domainName, stage) {
  return new aws.ApiGatewayManagementApi({
    endpoint: `${domainName}/${stage}`,
    apiVersion: "2018-11-29",
  });
}

export async function handler(event) {
  const db = await arc.tables();

  const work = event.Records.map(async (rec) => {
    if (rec.eventName !== "INSERT" && rec.eventName !== "MODIFY") return;
    const newImage = arc.events.unwrap(rec.dynamodb.NewImage);
    const { pk, optionId, userId } = newImage;
    if (!pk || !pk.startsWith("POLL#")) return;

    // Find all connections for this poll
    const conns = await db.pollConnections.query({
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk },
    });

    // Group connections by domain/stage for optimal posting
    const byEndpoint = new Map();
    for (const c of conns.Items || []) {
      const endpoint = `${c.domainName || process.env.DOMAIN_NAME}/${c.stage || process.env.STAGE}`;
      if (!byEndpoint.has(endpoint)) byEndpoint.set(endpoint, []);
      byEndpoint.get(endpoint).push(c);
    }

    const payload = JSON.stringify({
      type: "vote.update",
      pollId: pk.replace("POLL#", ""),
      userId,
      optionId,
    });

    for (const [endpoint, list] of byEndpoint.entries()) {
      const [domainName, stage] = endpoint.split("/");
      const mgmt = getManagementClient(domainName, stage);
      await Promise.all(
        list.map(async (c) => {
          try {
            await mgmt
              .postToConnection({
                ConnectionId: c.sk.replace("CONN#", ""),
                Data: payload,
              })
              .promise();
          } catch (err) {
            if (err && err.statusCode === 410) {
              // stale, delete mapping
              await db.pollConnections.delete({ pk: c.pk, sk: c.sk });
            } else {
              console.error("Broadcast error", err);
            }
          }
        }),
      );
    }
  });

  await Promise.all(work);
}

export const config = { runtime: "nodejs18.x" };
