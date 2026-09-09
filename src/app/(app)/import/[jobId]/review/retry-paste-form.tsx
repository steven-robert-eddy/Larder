"use client";

import { useActionState } from "react";
import { retryPasteImportAction } from "../../actions";

export function RetryPasteForm({ jobId, defaultText, label }: { jobId: string; defaultText?: string; label: string }) {
  const [state, formAction, pending] = useActionState(retryPasteImportAction.bind(null, jobId), {
    error: null,
  });

  return (
    <form action={formAction} className="mb-6 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <label htmlFor="text" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <textarea
        id="text"
        name="text"
        required
        rows={8}
        defaultValue={defaultText}
        placeholder="Paste the Reel's caption here — expand it first with 'more' if Instagram truncated it."
        className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
      />

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
        {pending ? "Reading..." : "Extract from caption"}
      </button>
    </form>
  );
}
