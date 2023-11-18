import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { useEffect, useRef } from "react";

import { createOptionsList } from "~/models/optionsList.server";
import { requireUserId } from "~/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const userId = await requireUserId(request);

    const formData = await request.formData();
    const name = formData.get("name");

    if (typeof name !== "string" || name.length === 0) {
        return json(
            { errors: { name: "Name is required" } },
            { status: 400 },
        );
    }

    const optionsList = await createOptionsList({ name: name, ownerUserId: userId });

    return redirect(`/optionsLists/${optionsList.id}`);
};

export default function NewNotePage() {
    const actionData = useActionData<typeof action>();
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (actionData?.errors?.name) {
            nameRef.current?.focus();
        }
    }, [actionData]);

    return (
        <Form
            method="post"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: "100%",
            }}
        >
            <div>
                <label className="flex w-full flex-col gap-1">
                    <span>Name: </span>
                    <input
                        ref={nameRef}
                        name="name"
                        className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
                        aria-invalid={actionData?.errors?.name ? true : undefined}
                        aria-errormessage={
                            actionData?.errors?.name ? "name-error" : undefined
                        }
                    />
                </label>
                {actionData?.errors?.name ? (
                    <div className="pt-1 text-red-700" id="name-error">
                        {actionData.errors.name}
                    </div>
                ) : null}
            </div>

            <div className="text-right">
                <button
                    type="submit"
                    className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
                >
                    Save
                </button>
            </div>
        </Form>
    );
}