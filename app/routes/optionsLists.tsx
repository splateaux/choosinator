import { LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import Layout from "~/components/Layout";
import { getOptionsListsByOwner } from "~/models/optionsList.server";
import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const optionsLists = await getOptionsListsByOwner(userId);
  return json({ optionsLists });
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

            {data.optionsLists.length === 0 ? (
              <p className="p-4">No Options Lists yet</p>
            ) : (
              <ol>
                {data.optionsLists.map((optionList) => (
                  <li key={optionList.id}>
                    <NavLink
                      className={({ isActive }) =>
                        `block border-b p-4 text-xl ${isActive ? "bg-white" : ""
                        }`
                      }
                      to={optionList.id}
                    >
                      📝 {optionList.name}
                    </NavLink>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </Layout>
  );
}
