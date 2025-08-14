// events/vote-updated/index.mjs
function extractPayload(evt) {
  try {
    if (evt?.Records?.[0]?.Sns?.Message) {
      return JSON.parse(evt.Records[0].Sns.Message);
    }
  } catch (e) {
    console.warn("[vote-updated] extractPayload error:", e?.message || e);
  }
  return null;
}

const getConnId = (row) => {
  if (row?.connectionId) return row.connectionId;
  if (row?.sk?.startsWith("CONN#")) return row.sk.slice(5);
  return row?.sk || row?.pk || null;
};

export const handler = async (evt) => {
  const arc = (await import("@architect/functions")).default;
  const tables = await arc.tables();
  const ws = arc.ws;

  const payload = extractPayload(evt) || {};
  const pollId = (payload.pk || "").replace(/^POLL#|^poll#/, "");
  const msg = JSON.stringify({ type: "vote-updated", ...payload });

  console.log("[vote-updated] pollId:", pollId || "<none>");

  let conns = [];
  try {
    if (pollId) {
      // Use the dedicated pollId-connectionId-index for efficient querying
      const q = await tables.pollConnections.query({
        IndexName: 'pollId-connectionId-index',
        KeyConditionExpression: 'pollId = :pollId',
        ExpressionAttributeValues: { ':pollId': pollId }
      });
      conns = q?.Items || [];
      console.log(`[vote-updated] GSI query hit: ${conns.length} connections`);
    } else {
      throw new Error("no pollId");
    }
  } catch (e) {
    console.warn(
      "[vote-updated] GSI query failed, fallback to scan:",
      e?.message || e,
    );
    const s = await tables.pollConnections.scan({});
    conns = s?.Items || [];
    if (pollId) {
      // filter in JS if we have an id but query failed
      conns = conns.filter(
        (r) => r.pk === `POLL#${pollId}` || r.pollId === pollId,
      );
    }
    console.log(`[vote-updated] scan/filter: ${conns.length} connections`);
  }

  if (!conns.length) {
    console.log("[vote-updated] no connections to notify");
    return;
  }

  const results = await Promise.allSettled(
    conns.map((row) => {
      const id = getConnId(row);
      if (!id) {
        console.warn("[vote-updated] skip row without connection id:", row);
        return;
      }
      // eslint-disable-next-line no-undef
      if (process.env.ARC_LOCAL === "true") {
        return ws.send({ id, payload: msg });
      }
      if (!row.domainName || !row.stage) {
        console.warn(
          "[vote-updated] missing domainName/stage for AWS send:",
          row,
        );
        return;
      }
      return ws.send({
        id,
        payload: msg,
        requestContext: { domainName: row.domainName, stage: row.stage },
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length)
    console.warn("[vote-updated] WS send failures:", failed.length);
  else console.log("[vote-updated] broadcast complete");
};
