import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { createUser, getUserByEmail } from "~/models/user.server";
import { createUserSession } from "~/session.server";

const DEFAULT_DEV_USER = {
    email: "dev@example.com",
    password: "devpassword123",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
    if (process.env.NODE_ENV === "production") {
        return redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }

    // Check if the default user already exists
    let user = await getUserByEmail(DEFAULT_DEV_USER.email);

    // If user doesn't exist, create them
    if (!user) {
        user = await createUser(DEFAULT_DEV_USER.email, DEFAULT_DEV_USER.password);
    }

    // Log in the user and redirect to home
    return createUserSession({
        redirectTo: "/",
        remember: true,
        request,
        userId: user.id,
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    if (process.env.NODE_ENV === "production") {
        return redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }

    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        throw new Error("Email and password are required");
    }

    // Check if user already exists
    let user = await getUserByEmail(email);

    // If user doesn't exist, create them
    if (!user) {
        user = await createUser(email, password);
    }

    // Log in the user and redirect to home
    return createUserSession({
        redirectTo: "/",
        remember: true,
        request,
        userId: user.id,
    });
};

export default function DevAutoLogin() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Development Auto-Login
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        This route is only available in development mode
                    </p>
                </div>

                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Quick Login Options
                            </h3>

                            <div className="space-y-3">
                                <form method="get" action="/dev-auto-login">
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Auto-login as dev@example.com
                                    </button>
                                </form>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">Or create custom user</span>
                                    </div>
                                </div>

                                <form method="post" className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                            placeholder="user@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                            placeholder="password123"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Create & Login
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 