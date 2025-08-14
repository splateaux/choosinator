// events/vote-updated/index.mjs
function extractPayload(evt) {
    try {
        if (evt?.Records?.[0]?.Sns?.Message) {
            return JSON.parse(evt.Records[0].Sns.Message);
        }
    } catch { }
    return null;
}

const getConnId = (row) => {
    if (row?.connectionId) return row.connectionId;
    if (row?.sk?.startsWith('CONN#')) return row.sk.slice(5);
    return row?.sk || row?.pk || null;
};

export const handler = async (evt) => {
    const arc = (await import('@architect/functions')).default;
    const tables = await arc.tables();
    const ws = arc.ws;

    const payload = extractPayload(evt) || {};
    const pollId = (payload.pk || '').replace(/^POLL#|^poll#/, '');
    const msg = JSON.stringify({ type: 'vote-updated', ...payload });

    console.log('[vote-updated] pollId:', pollId || '<none>');

    let conns = [];
    try {
        if (pollId) {
            // try key query first
            const q = await tables.pollConnections.query({ pk: `POLL#${pollId}` });
            conns = q?.Items || [];
            console.log(`[vote-updated] query hit: ${conns.length} connections`);
        } else {
            throw new Error('no pollId');
        }
    } catch (e) {
        console.warn('[vote-updated] query fallback to scan:', e?.message || e);
        const s = await tables.pollConnections.scan({});
        conns = s?.Items || [];
        if (pollId) {
            // filter in JS if we have an id but query failed
            conns = conns.filter(r => r.pk === `POLL#${pollId}` || r.pollId === pollId);
        }
        console.log(`[vote-updated] scan/filter: ${conns.length} connections`);
    }

    if (!conns.length) {
        console.log('[vote-updated] no connections to notify');
        return;
    }

    const results = await Promise.allSettled(
        conns.map((row) => {
            const id = getConnId(row);
            if (!id) {
                console.warn('[vote-updated] skip row without connection id:', row);
                return;
            }
            if (process.env.ARC_LOCAL === 'true') {
                return ws.send({ id, payload: msg });
            }
            if (!row.domainName || !row.stage) {
                console.warn('[vote-updated] missing domainName/stage for AWS send:', row);
                return;
            }
            return ws.send({
                id,
                payload: msg,
                requestContext: { domainName: row.domainName, stage: row.stage },
            });
        })
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) console.warn('[vote-updated] WS send failures:', failed.length);
    else console.log('[vote-updated] broadcast complete');
};



/*
export async function handler(event) {
    console.log('MORTON - vote-updated event received: {event}', { event });
    console.log('vote-updated event received:', JSON.stringify(event, null, 2));

    // event = { name: 'vote-updated', payload: {...} }
    const { pk, sk, userId, optionId, updatedAt, tokens, source } = event.payload;

    try {
        const tables = await arc.tables();
        console.log('MORTON - before arc.ws variable declared');
        const ws = arc.ws; // Architect's ws helper
        console.log('MORTON - after arc.ws variable declared');

        // Extract pollId from pk (format: POLL#<pollId>)
        const pollId = pk.replace('POLL#', '');

        // Look up active connections for this poll
        const { pollConnections } = tables;
        const connections = await pollConnections.query({
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': pk },
        });

        if (!connections.Items || connections.Items.length === 0) {
            console.log(`No active connections found for poll ${pollId}`);
            return;
        }

        // Prepare the message to broadcast
        const message = JSON.stringify({
            type: 'vote-updated',
            pollId,
            optionId,
            userId,
            tokens,
            updatedAt,
            source,
        });

        console.log(`Broadcasting vote update to ${connections.Items.length} connections for poll ${pollId}`);

        // Best effort fanout to all connected clients
        const sendPromises = connections.Items.map(connection => {
            try {
                return ws.send({
                    id: connection.sk.replace('CONN#', ''), // Extract connectionId from sk
                    payload: message,
                    requestContext: {
                        domainName: connection.domainName,
                        stage: connection.stage
                    },
                });
            } catch (error) {
                console.error(`Failed to send to connection ${connection.sk}:`, error);
                return Promise.resolve(); // Don't fail the whole batch
            }
        });

        await Promise.allSettled(sendPromises);
        console.log(`Vote update broadcast completed for poll ${pollId}`);

    } catch (error) {
        console.error('Error processing vote-updated event:', error);
        throw error; // Let the event system handle retries
    }

    return { statusCode: 200 };
};
*/
