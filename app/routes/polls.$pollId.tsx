import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { useEffect } from "react";
import invariant from "tiny-invariant";

import { getOptionsForList } from "~/models/option.server";
import { getPollById } from "~/models/poll.server";
import { getGuestName, getUserId, setGuestNameSession } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.pollId, "pollId not found");
  const poll = await getPollById(params.pollId);
  if (!poll) throw new Response("Not Found", { status: 404 });

  const options = await getOptionsForList(poll.optionsListId);
  const userId = await getUserId(request);
  const guestName = await getGuestName(request);
  return json({ poll, options, userId, guestName });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Voting not implemented yet per story; handle guest name capture noop
  const formData = await request.formData();
  const guestName = (formData.get("guestName") as string) || "";
  if (!guestName.trim()) {
    return json(
      { error: "Name is required to continue as Guest" },
      { status: 400 },
    );
  }
  // Set guest name in session and remain on the poll page
  return setGuestNameSession({
    request,
    guestName,
    redirectTo: new URL(request.url).pathname,
  });
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
  const presenceFetcher = useFetcher<{
    participants: { clientId: string; displayName: string }[];
  }>();

  // Heartbeat to announce presence and poll participants periodically
  // Intentionally depend ONLY on poll id; fetcher identity changes will retrigger this effect
  // and create runaway intervals. This is safe because we always target the current poll id.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pollId = data.poll.id;
    // Initial announce + initial list load
    presenceFetcher.submit(new FormData(), {
      method: "post",
      action: `/polls/${pollId}/presence`,
    });

    const heartbeat = setInterval(() => {
      presenceFetcher.submit(new FormData(), {
        method: "post",
        action: `/polls/${pollId}/presence`,
      });
    }, 10_000);

    return () => {
      clearInterval(heartbeat);
    };
  }, [data.poll.id]);

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
              <button className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                Continue as Guest
              </button>
            </Form>
          </div>
          {actionData?.error ? (
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
          <ul className="divide-y rounded border">
            {data.options.map((opt) => (
              <li key={opt.id} className="p-3">
                <div className="font-medium">{opt.name}</div>
                {opt.description ? (
                  <div className="text-sm text-gray-600">{opt.description}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
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
