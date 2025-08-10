import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { createUser } from "~/models/user.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 test routes should not be enabled in production 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨",
    );
    // test routes should not be enabled in production or without
    // enable test routes... Just in case this somehow slips through
    // we'll return an error :)
    return json(
      { error: "Test routes not available in production" },
      { status: 403 },
    );
  }

  const { email } = await request.json();
  if (!email) {
    throw new Error("email required for user creation");
  }
  if (!email.endsWith("@example.com")) {
    throw new Error("All test emails must end in @example.com");
  }

  const user = await createUser(email, "devpassword123");

  return json({ success: true, user: { id: user.id, email: user.email } });
};

export default null;
