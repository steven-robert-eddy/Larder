"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNotesAction } from "../actions";

export function NotesEditor({ recipeId, initialNotes }: { recipeId: string; initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = value !== initialNotes;

  function save() {
    startTransition(async () => {
      await updateNotesAction(recipeId, value);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Your own tweaks, substitutions, what worked..."
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
      />
      {dirty ? (
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="self-start rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending ? "Saving..." : "Save notes"}
        </button>
      ) : null}
    </div>
  );
}
