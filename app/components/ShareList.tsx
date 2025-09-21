import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";

import { User } from "~/models/user.server";

interface ShareListProps {
  optionsListId: string;
  sharedUsers: User[];
  userShares?: { user: User; permission: "view" | "edit" }[];
}

export default function ShareList({
  optionsListId,
  sharedUsers,
  userShares = [],
}: ShareListProps) {
  const actionData = useActionData<{
    error?: string;
    success?: string;
    action?: string;
  }>();

  // Only show errors that are not from option actions
  const sharingError =
    actionData?.error && !actionData.action?.startsWith("option.")
      ? actionData.error
      : undefined;
  const sharingSuccess =
    actionData?.success && !actionData.action?.startsWith("option.")
      ? actionData.success
      : undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    if (!email.trim()) {
      e.preventDefault();
      return;
    }
    setEmail("");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Share List</h3>

      {/* Share form */}
      <Form method="post" onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="action" value="share" />
        <input type="hidden" name="optionsListId" value={optionsListId} />

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Share with (email address)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="user@example.com"
              required
            />
            <select
              name="permission"
              data-testid="new-user-permission-select"
              className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              defaultValue="edit"
              aria-label="Permission"
            >
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
            <button
              type="submit"
              data-testid="share-new-user-button"
              disabled={isSubmitting || !email.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </Form>

      {/* Error/Success messages */}
      {sharingError ? (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{sharingError}</div>
        </div>
      ) : null}

      {sharingSuccess ? (
        <div
          className="rounded-md bg-green-50 p-4"
          data-testid="sharing-success-message"
        >
          <div className="text-sm text-green-700">{sharingSuccess}</div>
        </div>
      ) : null}

      {/* Currently shared users */}
      {sharedUsers.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Shared with:
          </h4>
          <ul className="space-y-2">
            {sharedUsers.map((user) => (
              <li
                key={user.id}
                data-testid={`shared-user-${user.id}`}
                className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
              >
                <span className="text-sm text-gray-900">
                  {user.email}
                  {userShares.length > 0 ? (
                    <span className="ml-2 text-gray-500">
                      (
                      {userShares.find((s) => s.user.id === user.id)
                        ?.permission === "view"
                        ? "View"
                        : "Edit"}
                      )
                    </span>
                  ) : null}
                </span>
                <Form method="post" className="inline flex items-center gap-2">
                  <input
                    type="hidden"
                    name="optionsListId"
                    value={optionsListId}
                  />
                  <input
                    type="hidden"
                    name="sharedWithUserId"
                    value={user.id}
                  />
                  <select
                    name="permission"
                    data-testid="existing-user-permission-select"
                    defaultValue={
                      userShares.find((s) => s.user.id === user.id)
                        ?.permission || "edit"
                    }
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                  </select>
                  <button
                    type="submit"
                    data-testid="existing-user-save-permission"
                    className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
                    name="action"
                    value="update-permission"
                  >
                    Save
                  </button>
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:text-red-800 focus:outline-none"
                    name="action"
                    value="unshare"
                  >
                    Remove
                  </button>
                </Form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
