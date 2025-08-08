import { LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import Layout from "~/components/Layout";
import {
  getOptionsListsByOwner,
  type OptionsList,
} from "~/models/optionsList.server";
import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);

  // For now, just get owned lists to avoid database issues
  const owned = await getOptionsListsByOwner(userId);
  const shared: OptionsList[] = []; // Empty for now

  return json({ owned, shared });
};

export default function OptionsListsPage() {
  const data = useLoaderData<typeof loader>();
  const user = useUser();

  return (
    <Layout user={user}>
      <div className="flex h-full min-h-screen flex-col">
        <main className="flex h-full">
          <div className="h-full w-80 border-r">
            <Link to="new" className="block p-4 text-xl">
              + New Options List
            </Link>

            <hr />

            <div>
              {/* Owned Lists */}
              <div>
                <h3 className="px-4 py-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                  My Lists
                </h3>
                {data.owned.length === 0 ? (
                  <p className="px-4 text-sm text-gray-500">No lists yet</p>
                ) : (
                  <ol>
                    {data.owned.map((optionList) => (
                      <li key={optionList.id}>
                        <NavLink
                          className={({ isActive }) =>
                            `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                          }
                          to={`/optionsLists/${optionList.id}`}
                        >
                          📝 {optionList.name}
                        </NavLink>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Shared Lists */}
              <div>
                <h3 className="px-4 py-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Shared with Me
                </h3>
                {data.shared.length === 0 ? (
                  <p className="px-4 text-sm text-gray-500">No shared lists</p>
                ) : (
                  <ol>
                    {data.shared.map((optionList) => (
                      <li key={optionList.id}>
                        <NavLink
                          className={({ isActive }) =>
                            `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                          }
                          to={`/optionsLists/${optionList.id}`}
                        >
                          👥 {optionList.name}
                        </NavLink>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </Layout>
  );
}
