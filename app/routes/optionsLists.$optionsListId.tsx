import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import { useEffect } from "react";

import { getOptionsList } from "~/models/optionsList.server";
import { requireUserId } from "~/session.server";
import { trackRouteChange } from "~/utils/performance";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.optionsListId, "optionsListsId not found");

  const optionsList = await getOptionsList({
    id: params.optionsListId,
    ownerUserId: userId,
  });
  if (!optionsList) {
    throw new Response("Not Found", { status: 404 });
  }
  return json({ optionsList });
};

export default function OptionsListDetailsPage() {
  const data = useLoaderData<typeof loader>();

  // Track route performance
  useEffect(() => {
    trackRouteChange(`optionsLists.${data.optionsList.id}`);
  }, [data.optionsList.id]);

  return (
    <div>
      <h3 className="text-2xl font-bold">{data.optionsList.name}</h3>
      <hr className="my-4" />
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs text-gray-500">
          <summary>🔍 Debug Info</summary>
          <pre className="mt-2 bg-gray-100 p-2 rounded">
            Options List ID: {data.optionsList.id}{'\n'}
            Owner: {data.optionsList.ownerUserId}{'\n'}
            Loaded at: {new Date().toISOString()}
          </pre>
        </details>
      )}
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
