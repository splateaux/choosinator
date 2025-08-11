import { createId } from "@paralleldrive/cuid2";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { listPresenceForPoll, upsertPresence } from "~/models/presence.server";
import { getGuestName, getUser, getSession } from "~/session.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
    invariant(params.pollId, "pollId not found");
    const participants = await listPresenceForPoll(params.pollId);
    return json({ participants }, { headers: { "Cache-Control": "no-store" } });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
    invariant(params.pollId, "pollId not found");

    // Determine display name: prefer logged-in user's email, fall back to guest name, otherwise Anonymous
    const user = await getUser(request);
    const guestName = await getGuestName(request);
    const displayName = user?.email ?? guestName ?? "Anonymous";

    // Use a stable clientId based on session id to deduplicate across tabs in same session
    const session = await getSession(request);
    let clientId = session.get("presenceClientId") as string | undefined;
    if (!clientId) {
        clientId = createId();
        session.set("presenceClientId", clientId);
    }

    await upsertPresence(params.pollId, clientId, displayName);
    const participants = await listPresenceForPoll(params.pollId);
    return json(
        { participants },
        {
            headers: {
                "Cache-Control": "no-store",
                "Set-Cookie": await (await import("~/session.server")).sessionStorage.commitSession(session),
            },
        },
    );
};


