import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { getOptionsForList } from "~/models/option.server";
import { getOptionsListForUser } from "~/models/optionsList.server";
import { createPoll } from "~/models/poll.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.optionsListId, "optionsListId not found");

  const list = await getOptionsListForUser({
    id: params.optionsListId,
    userId,
  });
  if (!list) throw new Response("Not Found", { status: 404 });

  const options = await getOptionsForList(params.optionsListId);
  return json({ list, options, userId });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.optionsListId, "optionsListId not found");

  const formData = await request.formData();
  const nameRaw = (formData.get("name") as string) || "";
  const name = nameRaw.trim();

  // Default name to list name if empty
  const list = await getOptionsListForUser({
    id: params.optionsListId,
    userId,
  });
  if (!list) return json({ error: "List not found" }, { status: 404 });

  // Get options to validate minimum requirement
  const options = await getOptionsForList(params.optionsListId);
  if (options.length < 2) {
    return json(
      {
        error:
          "You need at least 2 options in your list to create a poll. Please add more options first.",
      },
      { status: 400 },
    );
  }

  const poll = await createPoll({
    optionsListId: list.id,
    name: name || list.name,
    createdByUserId: userId,
  });

  return redirect(`/polls/${poll.id}`);
};

export default function NewPollFromList() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();

  const hasEnoughOptions = data.options.length >= 2;

  return (
    <div>
      <h3 className="text-2xl font-bold">
        Create Poll from &quot;{data.list.name}&quot;
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        This poll will include all {data.options.length} options from this list.
        {hasEnoughOptions ? null : (
          <span className="block text-red-600 mt-1">
            ⚠️ You need at least 2 options to create a poll. Please add more
            options first.
          </span>
        )}
      </p>
      {actionData?.error ? (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {actionData.error}
        </div>
      ) : null}
      <Form method="post" className="grid gap-3 max-w-md">
        <label className="grid gap-1">
          <span className="text-sm">Poll name (optional)</span>
          <input
            name="name"
            placeholder={data.list.name}
            aria-label="Poll name"
            className="rounded border px-2 py-1"
            disabled={!hasEnoughOptions}
          />
        </label>
        <div>
          <button
            type="submit"
            className={`rounded px-3 py-1 text-white ${
              hasEnoughOptions
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!hasEnoughOptions}
          >
            {hasEnoughOptions ? "Create Poll" : "Need More Options"}
          </button>
        </div>
      </Form>
    </div>
  );
}
