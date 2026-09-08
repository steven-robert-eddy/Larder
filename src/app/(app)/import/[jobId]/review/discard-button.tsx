"use client";

import { discardImportAction } from "../../actions";

export function DiscardButton({ jobId }: { jobId: string }) {
  return (
    <form
      action={discardImportAction.bind(null, jobId)}
      onSubmit={(e) => {
        if (!confirm("Discard this import? Nothing will be saved.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="shrink-0 text-sm text-neutral-400 hover:text-red-600 dark:hover:text-red-400">
        Discard
      </button>
    </form>
  );
}
