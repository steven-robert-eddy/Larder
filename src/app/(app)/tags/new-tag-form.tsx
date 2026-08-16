"use client";

import { useActionState } from "react";
import { FACET_LABELS } from "@/lib/taxonomy";
import type { TagFacet } from "@/generated/prisma/enums";
import { createTagAction } from "./actions";

export function NewTagForm() {
  const [state, formAction, pending] = useActionState(createTagAction, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="facet" className="text-xs text-neutral-500">
          Facet
        </label>
        <select
          id="facet"
          name="facet"
          defaultValue="CUSTOM"
          className="rounded-lg border border-neutral-300 px-2.5 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          {(Object.keys(FACET_LABELS) as TagFacet[]).map((facet) => (
            <option key={facet} value={facet}>
              {FACET_LABELS[facet]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-1 min-w-32 flex-col gap-1">
        <label htmlFor="name" className="text-xs text-neutral-500">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. instant favorite"
          className="w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "Adding..." : "Add tag"}
      </button>
      {state.error ? <p className="w-full text-xs text-red-600 dark:text-red-400">{state.error}</p> : null}
    </form>
  );
}
