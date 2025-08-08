import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { useEffect } from "react";
import invariant from "tiny-invariant";

import ShareList from "~/components/ShareList";
import {
  getOptionsList,
  getOptionsListForUser,
} from "~/models/optionsList.server";
import {
  getSharedUsersForOptionsList,
  shareOptionsList,
  unshareOptionsList,
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

  // Get shared users if this user is the owner
  let sharedUsers: User[] = [];
  if (optionsList.ownerUserId === userId) {
    try {
      sharedUsers = await getSharedUsersForOptionsList({
        optionsListId: params.optionsListId,
        ownerUserId: userId,
      });
    } catch (error) {
      // If the sharing table doesn't exist yet, just return empty shared users
      console.log("Sharing table not available yet:", error);
    }
  }

  return json({ optionsList, sharedUsers, currentUserId: userId });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.optionsListId, "optionsListId not found");

  const formData = await request.formData();
  const action = formData.get("action") as string;
  const optionsListId = params.optionsListId;

  // Verify the user owns this list
  const optionsList = await getOptionsList({
    id: optionsListId,
    ownerUserId: userId,
  });
  if (!optionsList) {
    return json({ error: "You can only share lists you own" }, { status: 403 });
  }

  if (action === "share") {
    const email = formData.get("email") as string;
    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user to share with
    const userToShareWith = await getUserByEmail(email);
    if (!userToShareWith) {
      return json({ error: "User not found" }, { status: 404 });
    }

    if (userToShareWith.id === userId) {
      return json(
        { error: "You cannot share a list with yourself" },
        { status: 400 },
      );
    }

    try {
      await shareOptionsList({
        optionsListId,
        ownerUserId: userId,
        sharedWithUserId: userToShareWith.id,
      });
      return json({ success: `List shared with ${email}` });
    } catch (error) {
      return json({ error: "Failed to share list" }, { status: 500 });
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
        ownerUserId: userId,
        sharedWithUserId,
      });
      return json({ success: "User removed from shared list" });
    } catch (error) {
      return json({ error: "Failed to unshare list" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function OptionsListDetailsPage() {
  const data = useLoaderData<typeof loader>();

  // Track route performance
  useEffect(() => {
    trackRouteChange(`optionsLists.${data.optionsList.id}`);
  }, [data.optionsList.id]);

  const isOwner = data.optionsList.ownerUserId === data.currentUserId;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">{data.optionsList.name}</h3>
        {!isOwner ? (
          <span className="text-sm text-gray-500">
            Shared by {data.optionsList.ownerUserId}
          </span>
        ) : null}
      </div>
      <hr className="my-4" />

      {/* Sharing section - only show for owners */}
      {isOwner ? (
        <div className="mb-6">
          <ShareList
            optionsListId={data.optionsList.id}
            sharedUsers={data.sharedUsers}
          />
        </div>
      ) : null}

      {process.env.NODE_ENV === "development" ? (
        <details className="mt-4 text-xs text-gray-500">
          <summary>🔍 Debug Info</summary>
          <pre className="mt-2 bg-gray-100 p-2 rounded">
            Options List ID: {data.optionsList.id}
            {"\n"}
            Owner: {data.optionsList.ownerUserId}
            {"\n"}
            Current User: {data.currentUserId}
            {"\n"}
            Is Owner: {isOwner.toString()}
            {"\n"}
            Loaded at: {new Date().toISOString()}
          </pre>
        </details>
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
