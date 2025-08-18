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
import { useTheme } from "~/root";
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
    ENV: { WS_URL: process.env.ARC_WSS_URL },
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
  const { toggleTheme } = useTheme();

  const revalidateRef = useRef(revalidator.revalidate);
  useEffect(() => {
    revalidateRef.current = revalidator.revalidate;
  }, [revalidator.revalidate]);

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
    const base =
      data.ENV?.WS_URL ??
      (window.location.protocol === "https:" ? "wss:" : "ws:") +
        `//${window.location.host}/testing`; // local fallback

    const url = `${base}?pollId=${data.poll.id}&userId=${encodeURIComponent(data.voterId)}`;

    console.log("🔌 [WS-CLIENT] Connecting to:", url);

    const ws = new WebSocket(url);

    ws.onopen = () => console.log("🔌 [WS-CLIENT] WS open", url);

    ws.onmessage = (event) => {
      console.log("🔌 [WS-CLIENT] WebSocket message received: ", event.data);
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
        console.warn("🔌 [WS-CLIENT] non-JSON message", event.data, error);
        return;
      }

      if (msg?.type !== "vote-updated") {
        console.warn("🔌 [WS-CLIENT] non-vote-updated message", msg);
        return;
      }

      const msgPollId =
        msg.pollId ??
        (typeof msg.pk === "string"
          ? msg.pk.replace(/^POLL#|^poll#/, "")
          : undefined);
      if (msgPollId !== data.poll.id) {
        console.warn("🔌 [WS-CLIENT] message for another poll", msg);
        return;
      }

      revalidateRef.current();
    };

    ws.onerror = (error) => {
      console.error("🔌 [WS-CLIENT] WS error", error);
    };

    ws.onclose = (event) => {
      console.log("🔌 [WS-CLIENT] WS closed", event.code, event.reason);
    };

    return () => ws.close();
  }, [data.poll.id, data.voterId, data.ENV?.WS_URL]);

  return (
    <main
      className="
        grid
        grid-cols-1
        lg:grid-cols-[minmax(320px,860px)_1fr]
        gap-x-8
        px-4 sm:px-6 lg:px-10
      "
    >
      <div className="col-start-1 w-full">
        <header className="w-full mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold">{data.poll.name}</h1>
              <p className="text-sm text-gray-600">Poll ID: {data.poll.id}</p>
            </div>
            <div className="flex items-center gap-3 flex-1 justify-end ml-6">
              <button
                onClick={toggleTheme}
                className="rounded border px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Toggle theme"
              >
                🔧
              </button>
              {data.userId ? (
                <Form action="/logout" method="post">
                  <button
                    type="submit"
                    className="rounded border px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  >
                    Log Out
                  </button>
                </Form>
              ) : (
                <a
                  href={`/login?redirectTo=/polls/${data.poll.id}`}
                  className="rounded border px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Log In
                </a>
              )}
            </div>
          </div>
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
                <input type="hidden" name="intent" value="guestName" />
                <input
                  name="guestName"
                  placeholder="Your name"
                  aria-label="Your name"
                  className="rounded border px-2 py-1"
                  required
                />
                <button
                  type="submit"
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

        <section
          className="
          w-full rounded-xl p-4
          border border-gray-100 bg-white ring-1 ring-black/5
          dark:border-white/10 dark:bg-slate-900/80 dark:ring-white/10
        "
        >
          <h2 className="text-xl font-semibold mb-2">Current Results</h2>
          {data.options.length === 0 ? (
            <p className="text-sm text-gray-500">No options available.</p>
          ) : (
            <div className="space-y-0">
              {data.options
                .map((opt) => {
                  const byUser = data.votes.byOption[opt.id]?.byUser || {};
                  const total = data.votes.byOption[opt.id]?.total || 0;
                  const segments = Object.entries(byUser).filter(
                    ([, t]) => t > 0,
                  );
                  return {
                    ...opt,
                    byUser,
                    total,
                    segments,
                  };
                })
                .sort((a, b) => b.total - a.total) // Sort by vote count descending
                .filter((opt) => opt.total > 0) // Only show options with votes
                .map((opt) => {
                  // Calculate the maximum total votes across all options for relative scaling
                  const maxTotal = Math.max(
                    ...data.options.map(
                      (o) => data.votes.byOption[o.id]?.total || 0,
                    ),
                  );
                  // Calculate the overall bar width as a percentage of the maximum votes
                  const overallBarWidth =
                    maxTotal > 0 ? (opt.total / maxTotal) * 100 : 0;

                  return (
                    <div
                      key={opt.id}
                      className="
                      py-2
                      bg-white
                      dark:bg-transparent
                    "
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="font-medium">{opt.name}</div>
                        <div className="text-sm font-mono text-gray-600 dark:text-gray-300 transition-all duration-700 ease-in-out transform hover:scale-105">
                          {opt.total} tokens
                        </div>
                      </div>
                      <div
                        className="
                        h-2.5 w-full rounded-full
                        bg-gray-200
                        dark:bg-slate-700
                      "
                        aria-label={`Vote bar for ${opt.name}`}
                      >
                        <div
                          className="flex h-full transition-all duration-700 ease-in-out"
                          style={{ width: `${overallBarWidth}%` }}
                        >
                          {opt.segments.length === 0 ? (
                            <div className="h-full w-0" />
                          ) : (
                            opt.segments.map(([uid, count]) => {
                              const color = userIdToColor(uid);
                              const w =
                                opt.total > 0 ? (count / opt.total) * 100 : 0;
                              return (
                                <div
                                  key={uid}
                                  className="h-full transition-all duration-700 ease-in-out"
                                  style={{
                                    width: `${w}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {(() => {
                const optionsWithNoVotes = data.options.filter(
                  (opt) => (data.votes.byOption[opt.id]?.total || 0) === 0,
                );
                return optionsWithNoVotes.length > 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2 border-none bg-transparent">
                    No votes yet for other options
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </section>

        <section className="w-full mt-8">
          <h2 className="text-xl font-semibold mb-2">Vote on Options</h2>
          {data.options.length === 0 ? (
            <p className="text-sm text-gray-500">No options available.</p>
          ) : (
            <ul
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              data-testid="options-list"
            >
              {data.options
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically for easy finding
                .map((opt) => {
                  const byUser = data.votes.byOption[opt.id]?.byUser || {};
                  const total = data.votes.byOption[opt.id]?.total || 0;
                  const currentUserVotes = byUser[data.voterId] || 0;

                  return (
                    <li
                      key={opt.id}
                      className="p-2 rounded border border-gray-100 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">
                            {opt.name}
                            {opt.description ? (
                              <span className="text-sm text-gray-600 font-normal ml-2">
                                - {opt.description}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Your votes: {currentUserVotes} | Total: {total}
                          </div>
                        </div>
                        <Form method="post" className="flex items-center gap-2">
                          <input
                            type="hidden"
                            name="intent"
                            value="vote.adjust"
                          />
                          <input
                            type="hidden"
                            name="pollId"
                            value={data.poll.id}
                          />
                          <input type="hidden" name="optionId" value={opt.id} />
                          <button
                            type="submit"
                            name="delta"
                            value={-1}
                            className="rounded border px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Decrease tokens for ${opt.name}`}
                            disabled={currentUserVotes <= 0}
                          >
                            −
                          </button>
                          <button
                            type="submit"
                            name="delta"
                            value={1}
                            className="rounded border px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Increase tokens for ${opt.name}`}
                            disabled={total >= data.maxTokens}
                          >
                            +
                          </button>
                        </Form>
                      </div>
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
    </main>
  );
}
