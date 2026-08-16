"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCookLogAction, deleteCookLogAction } from "../actions";

type CookLog = { id: string; cookedOn: string; notes: string | null };

export function CookLogSection({ recipeId, logs }: { recipeId: string; logs: CookLog[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addCookLogAction(recipeId, formData);
      formRef.current?.reset();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCookLogAction(recipeId, id);
      router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between text-sm text-neutral-500">
        <span>
          Made {logs.length} time{logs.length === 1 ? "" : "s"}
        </span>
        {logs[0] ? <span>Last: {formatDate(logs[0].cookedOn)}</span> : null}
      </div>

      <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500" htmlFor="cookedOn">
            Date
          </label>
          <input
            id="cookedOn"
            name="cookedOn"
            type="date"
            defaultValue={today}
            max={today}
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <div className="flex flex-1 min-w-32 flex-col gap-1">
          <label className="text-xs text-neutral-500" htmlFor="cookLogNotes">
            Notes
          </label>
          <input
            id="cookLogNotes"
            name="notes"
            placeholder="How'd it go?"
            className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Made it
        </button>
      </form>

      {logs.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {logs.map((log) => (
            <li key={log.id} className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
              <span>
                {formatDate(log.cookedOn)}
                {log.notes ? ` — ${log.notes}` : ""}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(log.id)}
                className="text-xs text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
