"use client";

import { useActionState } from "react";
import { createWebImportAction } from "./actions";

export function ImportUrlForm() {
  const [state, formAction, pending] = useActionState(createWebImportAction, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Recipe URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          inputMode="url"
          required
          autoFocus
          placeholder="https://example.com/some-great-recipe"
          className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "Fetching..." : "Import"}
      </button>
    </form>
  );
}
