"use client";

import { useActionState, useState } from "react";
import { createPhotoImportAction } from "../actions";

export function PhotoImportForm() {
  const [state, formAction, pending] = useActionState(createPhotoImportAction, { error: null });
  const [count, setCount] = useState(0);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="images" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Screenshots
        </label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(e) => setCount(e.target.files?.length ?? 0)}
          className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:border-neutral-700 dark:bg-neutral-950 dark:file:bg-neutral-100 dark:file:text-neutral-900"
        />
        <p className="text-xs text-neutral-400">
          Select multiple at once if the caption didn&apos;t fit on one screenshot — order doesn&apos;t
          have to be perfect, just roughly top-to-bottom. Up to 6.
          {count > 0 ? ` ${count} selected.` : ""}
        </p>
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
        {pending ? "Reading..." : "Extract from screenshots"}
      </button>
    </form>
  );
}
