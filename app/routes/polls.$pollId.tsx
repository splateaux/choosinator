import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "@remix-run/react";
import { useEffect, useRef } from "react";
import invariant from "tiny-invariant";

import { getOptionsForList } from "~/models/option.server";
import { getPollById } from "~/models/poll.server";
import {
  adjustVoteTokens,
  getVotesForPoll,
  MAX_TOKENS_PER_USER,
} from "~/models/vote.server";
import {
  getGuestName,
  getUserId,
  setGuestNameSession,
  getSession,
} from "~/session.server";
import { userIdToColor } from "~/utils/userColor";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.pollId, "pollId not found");
  const poll = await getPollById(params.pollId);
  if (!poll) throw new Response("Not Found", { status: 404 });

  const options = await getOptionsForList(poll.optionsListId);
  const userId = await getUserId(request);
  const guestName = await getGuestName(request);
  const session = await getSession(request);
  const voterId = userId ?? `session#${session.id}`;
  const votes = await getVotesForPoll(poll.id);
  return json({
    poll,
    options,
    userId,
    guestName,
    voterId,
    votes,
    maxTokens: MAX_TOKENS_PER_USER,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = (formData.get("intent") as string) || "";
  if (intent === "guestName") {
    const guestName = (formData.get("guestName") as string) || "";
    if (!guestName.trim()) {
      return json(
        { error: "Name is required to continue as Guest" },
        { status: 400 },
      );
    }
    return setGuestNameSession({
      request,
      guestName,
      redirectTo: new URL(request.url).pathname,
    });
  }

  if (intent === "vote.adjust") {
    const pollId = formData.get("pollId") as string;
    const optionId = formData.get("optionId") as string;
    const delta = Number(formData.get("delta"));
    const userId =
      (await getUserId(request)) ?? `session#${(await getSession(request)).id}`;
    invariant(pollId, "pollId missing");
    invariant(optionId, "optionId missing");
    invariant(!Number.isNaN(delta), "delta missing");
    const result = await adjustVoteTokens({ pollId, optionId, userId, delta });
    return json({ ok: true, ...result });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

// Avoid revalidating this route's loader on presence heartbeats
export function shouldRevalidate(args: {
  formAction?: string;
  formMethod?: string;
}) {
  const { formAction, formMethod } = args;
  if (
    formMethod?.toLowerCase() === "post" &&
    formAction?.endsWith("/presence")
  ) {
    return false;
  }
  return true;
}

export default function PollPublicPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const revalidator = useRevalidator();
  const presenceFetcher = useFetcher<{
    participants: { clientId: string; displayName: string }[];
  }>();

  const isSubmittingRef = useRef(false);
  const lastSubmitRef = useRef(0);

  // Heartbeat to announce presence and poll participants periodically
  useEffect(() => {
    const pollId = data.poll.id;
    // Initial announce + initial list load
    isSubmittingRef.current = true;
    presenceFetcher.submit(new FormData(), {
      method: "post",
      action: `/polls/${pollId}/presence`,
    });

    const heartbeat = setInterval(() => {
      const now = Date.now();
      if (isSubmittingRef.current) return;
      if (now - lastSubmitRef.current < 9000) return; // throttle
      isSubmittingRef.current = true;
      presenceFetcher.submit(new FormData(), {
        method: "post",
        action: `/polls/${pollId}/presence`,
      });
    }, 10_000);

    return () => {
      clearInterval(heartbeat);
    };
    // We intentionally exclude `presenceFetcher` to avoid recreating the interval
    // whenever the fetcher state updates, which would cause rapid resubmits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.poll.id]);

  // Track fetcher completion to update submission flags
  useEffect(() => {
    if (presenceFetcher.state === "idle") {
      isSubmittingRef.current = false;
      lastSubmitRef.current = Date.now();
    }
  }, [presenceFetcher.state]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const pollId = data.poll.id;
    const userId = data.voterId;

    // Construct WebSocket URL - in development it's ws://, in production it's wss://
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // URL encode the userId to handle special characters like @ in email addresses
    const encodedUserId = encodeURIComponent(userId);
    const wsUrl = `${protocol}//${host}?pollId=${pollId}&userId=${encodedUserId}`;

    console.log(`Attempting to connect to WebSocket: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection established successfully");
    };

    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message received: ", event.data);
      let msg: {
        type?: string;
        pk?: string;
        pollId?: string;
        optionId?: string;
        updatedAt?: string;
      };
      try {
        msg = JSON.parse(String(event.data));
      } catch (error) {
        console.warn("WS: non-JSON message", event.data, error);
        return;
      }

      if (msg?.type !== "vote-updated") {
        console.warn("WS: non-vote-updated message", msg); test
        return;
      }

      const msgPollId =
        msg.pollId ??
        (typeof msg.pk === "string"
          ? msg.pk.replace(/^POLL#|^poll#/, "")
          : undefined);
      if (msgPollId !== pollId) {
        console.warn("WS: message for another poll", msg);
        return;
      }

      revalidator.revalidate();
    };

    ws.onerror = (error) => {
      console.error("WebSocket connection error:", {
        error,
        readyState: ws.readyState,
        url: ws.url,
      });
    };

    return () => {
      console.log("Cleaning up WebSocket connection");
      ws.close();
    };
  }, [data.poll.id, data.voterId]);

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{data.poll.name}</h1>
        <p className="text-sm text-gray-600">Poll ID: {data.poll.id}</p>
      </header>

      {/* Auth choice */}
      {data.userId ? (
        <div className="mb-4 p-3 rounded bg-green-50 text-green-800 text-sm">
          You are signed in.
        </div>
      ) : data.guestName ? (
        <div className="mb-4 p-3 rounded bg-blue-50 text-blue-800 text-sm">
          Participating as guest:{" "}
          <span className="font-medium">{data.guestName}</span>
        </div>
      ) : (
        <div className="mb-6 grid gap-3">
          <div className="text-sm">Participate as:</div>
          <div className="flex gap-3">
            <a
              className="rounded bg-gray-800 px-3 py-1 text-white hover:bg-black"
              href={`/login?redirectTo=/polls/${data.poll.id}`}
            >
              Sign in
            </a>
            <Form method="post" className="flex items-center gap-2">
              <input
                name="guestName"
                placeholder="Your name"
                aria-label="Your name"
                className="rounded border px-2 py-1"
                required
              />
              <button
                name="intent"
                value="guestName"
                className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              >
                Continue as Guest
              </button>
            </Form>
          </div>
          {actionData && "error" in actionData ? (
            <div className="text-sm text-red-700" role="alert">
              {actionData.error}
            </div>
          ) : null}
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-2">Options</h2>
        {data.options.length === 0 ? (
          <p className="text-sm text-gray-500">No options available.</p>
        ) : (
          <ul className="divide-y rounded border" data-testid="options-list">
            {data.options.map((opt) => {
              const byUser = data.votes.byOption[opt.id]?.byUser || {};
              const total = data.votes.byOption[opt.id]?.total || 0;
              const segments = Object.entries(byUser).filter(([, t]) => t > 0);
              return (
                <li key={opt.id} className="p-3 grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{opt.name}</div>
                    <Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="intent" value="vote.adjust" />
                      <input type="hidden" name="pollId" value={data.poll.id} />
                      <input type="hidden" name="optionId" value={opt.id} />
                      <button
                        type="submit"
                        name="delta"
                        value={-1}
                        className="rounded border px-2 py-1"
                        aria-label={`Decrease tokens for ${opt.name}`}
                      >
                        −
                      </button>
                      <button
                        type="submit"
                        name="delta"
                        value={1}
                        className="rounded border px-2 py-1"
                        aria-label={`Increase tokens for ${opt.name}`}
                      >
                        +
                      </button>
                    </Form>
                  </div>
                  {opt.description ? (
                    <div className="text-sm text-gray-600">
                      {opt.description}
                    </div>
                  ) : null}
                  <div
                    className="h-3 w-full bg-gray-200 rounded overflow-hidden"
                    aria-label={`Vote bar for ${opt.name}`}
                  >
                    <div className="flex h-full w-full">
                      {segments.length === 0 ? (
                        <div className="h-full w-0" />
                      ) : (
                        segments.map(([uid, count]) => {
                          const color = userIdToColor(uid);
                          const w = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div
                              key={uid}
                              className="h-full"
                              style={{ width: `${w}%`, backgroundColor: color }}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">{total} tokens</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <div className="text-sm">
          Remaining balance:{" "}
          {Math.max(
            0,
            data.maxTokens - (data.votes.totalsByUser[data.voterId] || 0),
          )}{" "}
          tokens
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">People here now</h2>
        {presenceFetcher.data ? (
          presenceFetcher.data.participants.length === 0 ? (
            <p className="text-sm text-gray-500">Nobody else is here yet.</p>
          ) : (
            <ul
              className="rounded border divide-y"
              data-testid="participants-list"
            >
              {presenceFetcher.data.participants.map((p) => (
                <li key={p.clientId} className="p-2 text-sm">
                  {p.displayName}
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-gray-500">Loading participants…</p>
        )}
      </section>
    </div>
  );
}
