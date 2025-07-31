import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
    isRouteErrorResponse,
    useLoaderData,
    useRouteError,
} from "@remix-run/react";
import invariant from "tiny-invariant";

import { getOptionsList } from "~/models/optionsList.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const userId = await requireUserId(request);
    invariant(params.optionsListId, "optionsListsId not found");

    const optionsList = await getOptionsList({ id: params.optionsListId, ownerUserId: userId });
    if (!optionsList) {
        throw new Response("Not Found", { status: 404 });
    }
    return json({ optionsList });
};

export default function OptionsListDetailsPage() {
    const data = useLoaderData<typeof loader>();

    return (
        <div>
            <h3 className="text-2xl font-bold">{data.optionsList.name}</h3>
            <hr className="my-4" />
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