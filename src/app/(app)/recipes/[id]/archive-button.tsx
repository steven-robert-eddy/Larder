"use client";

import { archiveRecipeAction } from "../actions";

export function ArchiveButton({ recipeId }: { recipeId: string }) {
  return (
    <form
      action={archiveRecipeAction.bind(null, recipeId)}
      onSubmit={(e) => {
        if (!confirm("Archive this recipe? It'll be hidden from your library.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-neutral-400 hover:text-red-600 dark:hover:text-red-400">
        Archive
      </button>
    </form>
  );
}
