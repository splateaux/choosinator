import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  useActionData,
  Outlet,
  Link,
  useLocation,
} from "@remix-run/react";
import { useEffect } from "react";
import invariant from "tiny-invariant";

import ShareList from "~/components/ShareList";
import {
  getOptionsForList,
  createOption,
  updateOption,
  deleteOption,
  OptionNameConflictError,
} from "~/models/option.server";
import {
  getOptionsList,
  getOptionsListForUser,
} from "~/models/optionsList.server";
import {
  getSharedUsersForOptionsList,
  getUserSharesForOptionsList,
  updateSharePermission,
  shareOptionsList,
  unshareOptionsList,
  isOptionsListEditableByUser,
} from "~/models/optionsListSharing.server";
import { getUserByEmail, User } from "~/models/user.server";
import { requireUserId } from "~/session.server";
import { trackRouteChange } from "~/utils/performance";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.optionsListId, "optionsListsId not found");

  const optionsList = await getOptionsListForUser({
    id: params.optionsListId,
    userId: userId,
  });
  if (!optionsList) {
    throw new Response("Not Found", { status: 404 });
  }

  const [options, canEdit] = await Promise.all([
    getOptionsForList(params.optionsListId),
    isOptionsListEditableByUser({
      optionsListId: params.optionsListId,
      ownerUserId: optionsList.ownerUserId,
      userId,
    }),
  ]);

  // Get shared users if this user is the owner
  let sharedUsers: User[] = [];
  let userShares: Awaited<ReturnType<typeof getUserSharesForOptionsList>> = [];
  if (optionsList.ownerUserId === userId) {
    sharedUsers = await getSharedUsersForOptionsList({
      optionsListId: params.optionsListId,
    });
    userShares = await getUserSharesForOptionsList({
      optionsListId: params.optionsListId,
    });
  }

  return json({
    optionsList,
    options,
    canEdit,
    sharedUsers,
    userShares,
    currentUserId: userId,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.optionsListId, "optionsListId not found");

  const formData = await request.formData();
  const action = formData.get("action") as string;
  const optionsListId = params.optionsListId;

  // Owner-only actions (sharing)
  if (["share", "update-permission", "unshare"].includes(action)) {
    const optionsList = await getOptionsList({
      id: optionsListId,
      ownerUserId: userId,
    });
    if (!optionsList) {
      return json(
        { error: "You can only share lists you own" },
        { status: 403 },
      );
    }

    if (action === "share") {
      const email = formData.get("email") as string;
      const permission = (formData.get("permission") as string) || "edit";
      if (!email) {
        return json({ error: "Email is required" }, { status: 400 });
      }

      // Find the user to share with
      const userToShareWith = await getUserByEmail(email);
      if (!userToShareWith) {
        return json(
          { error: "User not found", action: "share" },
          { status: 404 },
        );
      }

      if (userToShareWith.id === userId) {
        return json(
          { error: "You cannot share a list with yourself", action: "share" },
          { status: 400 },
        );
      }

      try {
        await shareOptionsList({
          optionsListId,
          ownerUserId: userId,
          sharedWithUserId: userToShareWith.id,
          permission: permission === "view" ? "view" : "edit",
        });
        return json({ success: `List shared with ${email}`, action: "share" });
      } catch (error) {
        console.error(`Failed to share list:`, error);
        return json(
          { error: "Failed to share list", action: "share" },
          { status: 500 },
        );
      }
    }

    if (action === "update-permission") {
      const sharedWithUserId = formData.get("sharedWithUserId") as User["id"];
      const permission = formData.get("permission") as string;
      if (!sharedWithUserId || !permission) {
        return json(
          { error: "User ID and permission are required" },
          { status: 400 },
        );
      }

      try {
        await updateSharePermission({
          optionsListId,
          ownerUserId: userId,
          sharedWithUserId,
          permission: permission === "view" ? "view" : "edit",
        });
        return redirect(`/optionsLists/${optionsListId}`);
      } catch (error) {
        return json(
          { error: "Failed to update permission", action: "update-permission" },
          { status: 500 },
        );
      }
    }

    if (action === "unshare") {
      const sharedWithUserId = formData.get("sharedWithUserId") as User["id"];
      if (!sharedWithUserId) {
        return json({ error: "User ID is required" }, { status: 400 });
      }

      try {
        await unshareOptionsList({
          optionsListId,
          sharedWithUserId,
        });
        return json({
          success: "User removed from shared list",
          action: "unshare",
        });
      } catch (error) {
        return json(
          { error: "Failed to unshare list", action: "unshare" },
          { status: 500 },
        );
      }
    }
  }

  // Option CRUD actions (owner or editor)
  if (action?.startsWith("option.")) {
    // Load list context for permission
    const listForUser = await getOptionsListForUser({
      id: optionsListId,
      userId,
    });
    if (!listForUser) {
      return json({ error: "List not found" }, { status: 404 });
    }

    const canEdit = await isOptionsListEditableByUser({
      optionsListId,
      ownerUserId: listForUser.ownerUserId,
      userId,
    });
    if (!canEdit) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "option.create") {
      const name = (formData.get("name") as string)?.trim();
      const description = (
        (formData.get("description") as string) || ""
      ).trim();
      if (!name) {
        return json({ error: "Name is required" }, { status: 400 });
      }
      try {
        await createOption({ optionsListId, name, description });
        return redirect(`/optionsLists/${optionsListId}`);
      } catch (error) {
        if (error instanceof OptionNameConflictError) {
          return json(
            { error: error.message, action: "option.create" },
            { status: 409 },
          );
        }
        throw error;
      }
    }

    if (action === "option.update") {
      const id = formData.get("id") as string;
      const name = (formData.get("name") as string)?.trim();
      const description = (
        (formData.get("description") as string) || ""
      ).trim();
      if (!id) {
        return json({ error: "Option ID is required" }, { status: 400 });
      }
      if (!name) {
        return json({ error: "Name is required" }, { status: 400 });
      }
      try {
        await updateOption({ optionsListId, id, name, description });
        return redirect(`/optionsLists/${optionsListId}`);
      } catch (error) {
        if (error instanceof OptionNameConflictError) {
          return json(
            { error: error.message, action: "option.update" },
            { status: 409 },
          );
        }
        throw error;
      }
    }

    if (action === "option.delete") {
      const id = formData.get("id") as string;
      if (!id) {
        return json({ error: "Option ID is required" }, { status: 400 });
      }
      await deleteOption({ optionsListId, id });
      return redirect(`/optionsLists/${optionsListId}`);
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function OptionsListDetailsPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; action?: string }>();
  const location = useLocation();

  // Filter errors by action type to avoid conflicts
  const optionError = actionData?.action?.startsWith("option.")
    ? actionData.error
    : undefined;

  // Track route performance
  useEffect(() => {
    trackRouteChange(`optionsLists.${data.optionsList.id}`);
  }, [data.optionsList.id]);

  const isOwner = data.optionsList.ownerUserId === data.currentUserId;
  const creatingPoll =
    location.pathname === `/optionsLists/${data.optionsList.id}/polls/new`;

  return (
    <div>
      {/* Nested routes render here, e.g., /optionsLists/:id/polls/new */}
      <Outlet />

      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">{data.optionsList.name}</h3>
        {!isOwner ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Shared by {data.optionsList.ownerUserId}
            </span>
            {"permission" in data.optionsList ? (
              <span
                className="text-xs text-gray-600 font-medium px-2 py-1 bg-gray-100 rounded"
                data-testid="permission-badge"
              >
                {data.optionsList.permission === "view"
                  ? "View Only"
                  : "Can Edit"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <hr className="my-4" />

      {/* Options management - hidden while creating a poll */}
      {!creatingPoll ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold">Options</h4>
            <div className="flex items-center gap-2">
              <Link
                to={`/optionsLists/${data.optionsList.id}/polls/new`}
                className="text-sm rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-700"
              >
                Create Poll
              </Link>
              {!data.canEdit ? (
                <span
                  className="text-xs text-gray-500"
                  data-testid="options-view-only"
                >
                  View Only
                </span>
              ) : null}
            </div>
          </div>

          {optionError ? (
            <div
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
              data-testid="option-error-message"
            >
              {optionError}
            </div>
          ) : null}

          {data.canEdit ? (
            <form method="post" className="mb-4 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="action" value="option.create" />
              <input
                name="name"
                placeholder="Name"
                aria-label="Option name"
                className="rounded border px-2 py-1"
                required
              />
              <input
                name="description"
                placeholder="Description (optional)"
                aria-label="Option description"
                className="rounded border px-2 py-1 sm:col-span-2"
              />
              <div>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                >
                  Add Option
                </button>
              </div>
            </form>
          ) : null}

          {data.options.length === 0 ? (
            <p className="text-sm text-gray-500">No options yet</p>
          ) : (
            <ul className="divide-y rounded border">
              {data.options.map((opt) => (
                <li key={opt.id} className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{opt.name}</div>
                      {opt.description ? (
                        <div className="text-sm text-gray-600 truncate">
                          {opt.description}
                        </div>
                      ) : null}
                    </div>
                    {data.canEdit ? (
                      <div className="flex items-center gap-2">
                        <form method="post">
                          <input
                            type="hidden"
                            name="action"
                            value="option.delete"
                          />
                          <input type="hidden" name="id" value={opt.id} />
                          <button
                            type="submit"
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>

                  {data.canEdit ? (
                    <details className="mt-2">
                      <summary
                        className="cursor-pointer text-sm text-gray-600"
                        data-testid="option-edit-toggle"
                      >
                        Edit
                      </summary>
                      <form
                        method="post"
                        className="mt-2 grid gap-2 sm:grid-cols-3"
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="option.update"
                        />
                        <input type="hidden" name="id" value={opt.id} />
                        <input
                          name="name"
                          defaultValue={opt.name}
                          className="rounded border px-2 py-1"
                          required
                        />
                        <input
                          name="description"
                          defaultValue={opt.description}
                          className="rounded border px-2 py-1 sm:col-span-2"
                        />
                        <div>
                          <button
                            type="submit"
                            data-testid="option-edit-save"
                            className="rounded bg-gray-800 px-3 py-1 text-white hover:bg-black"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Sharing section - only show for owners; hidden while creating a poll */}
      {isOwner && !creatingPoll ? (
        <div className="mb-6">
          <ShareList
            optionsListId={data.optionsList.id}
            sharedUsers={data.sharedUsers}
            userShares={data.userShares}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return <div>An unexpected error occurred: {error.message}</div>;
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>Unknown Error</h1>;
  }

  if (error.status === 404) {
    return <div>Options List not found</div>;
  }

  return <div>An unexpected error occurred: {error.statusText}</div>;
}
