"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { tagLabel } from "@/lib/taxonomy";
import type { TagFacet } from "@/generated/prisma/enums";
import { deleteTagAction } from "./actions";

export type TagRow = { id: string; facet: TagFacet; name: string; isSystem: boolean; recipeCount: number };

export function TagList({ tags }: { tags: TagRow[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(tag: TagRow) {
    const message = tag.recipeCount > 0
      ? `Delete "${tagLabel(tag.facet, tag.name)}"? It'll be removed from ${tag.recipeCount} recipe${tag.recipeCount === 1 ? "" : "s"}.`
      : `Delete "${tagLabel(tag.facet, tag.name)}"?`;
    if (!confirm(message)) return;
    startTransition(async () => {
      await deleteTagAction(tag.id);
      router.refresh();
    });
  }

  return (
    <ul className={`flex flex-wrap gap-2 ${pending ? "opacity-60" : ""}`}>
      {tags.map((tag) => (
        <li
          key={tag.id}
          className="flex items-center gap-1.5 rounded-full border border-neutral-300 py-1 pl-3 pr-1.5 text-sm dark:border-neutral-700"
        >
          <span>{tagLabel(tag.facet, tag.name)}</span>
          {tag.recipeCount > 0 ? <span className="text-xs text-neutral-400">{tag.recipeCount}</span> : null}
          <button
            type="button"
            onClick={() => handleDelete(tag)}
            aria-label={`Delete ${tag.name}`}
            className="flex size-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800 dark:hover:text-red-400"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
