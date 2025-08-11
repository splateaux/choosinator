import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { getOptionsForList } from "~/models/option.server";
import { getPollById } from "~/models/poll.server";
import { getUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    invariant(params.pollId, "pollId not found");
    const poll = await getPollById(params.pollId);
    if (!poll) throw new Response("Not Found", { status: 404 });

    const options = await getOptionsForList(poll.optionsListId);
    const userId = await getUserId(request);
    return json({ poll, options, userId });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    // Voting not implemented yet per story; handle guest name capture noop
    const formData = await request.formData();
    const guestName = (formData.get("guestName") as string) || "";
    if (!guestName.trim()) {
        return json({ error: "Name is required to continue as Guest" }, { status: 400 });
    }
    // For now, do nothing further; page will simply reload
    return json({ ok: true });
};

export default function PollPublicPage() {
    const data = useLoaderData<typeof loader>();

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
        </div>
    );
}


