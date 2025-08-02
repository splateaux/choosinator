/**
 * API route for direct options list fetching (bypasses Remix loader)
 * Useful for cache warming and background updates
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { getOptionsList } from "~/models/optionsList.server";
import { requireUserId } from "~/session.server";

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

    // Add cache headers for better performance
    return json(
        { optionsList },
        {
            headers: {
                "Cache-Control": "private, max-age=60", // Cache for 1 minute
                "X-Data-Source": "api-direct", // Help identify direct API usage
            },
        }
    );
};