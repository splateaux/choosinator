import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import Layout from "~/components/Layout";
import { useOptionalUser } from "~/utils";

export const meta: MetaFunction = () => [{ title: "Remix Notes" }];

export default function Index() {
  const user = useOptionalUser();
  return (
    <main className="relative min-h-screen">
      <Layout user={user}>
        <div className="relative sm:pb-16 sm:pt-8">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
              {user ? (
                <div>
                  <Link
                    to="/notes"
                    className="flex items-center justify-center rounded-md border border-transparent px-4 py-3 text-base font-medium shadow-sm hover:bg-red-50 sm:px-8"
                  >
                    View Notes for {user.email}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                  Words will go here eventually
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </main>
  );
}
