import { requireUser } from "@/lib/session";
import { listTagsForUser } from "@/lib/tags";
import { FACET_LABELS } from "@/lib/taxonomy";
import type { TagFacet } from "@/generated/prisma/enums";
import { NewTagForm } from "./new-tag-form";
import { TagList } from "./tag-list";

export default async function TagsPage() {
  const user = await requireUser();
  const tags = await listTagsForUser(user.id);

  const byFacet: Partial<Record<TagFacet, typeof tags>> = {};
  for (const tag of tags) {
    (byFacet[tag.facet] ??= []).push(tag);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Tags</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Seeded tags plus anything you&apos;ve added. Deleting a tag removes it from any recipes using it.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Add a tag</h2>
        <NewTagForm />
      </section>

      <div className="flex flex-col gap-6">
        {(Object.keys(FACET_LABELS) as TagFacet[]).map((facet) => (
          <section key={facet}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {FACET_LABELS[facet]}
            </h2>
            {byFacet[facet]?.length ? (
              <TagList
                tags={byFacet[facet]!.map((t) => ({
                  id: t.id,
                  facet: t.facet,
                  name: t.name,
                  isSystem: t.isSystem,
                  recipeCount: t._count.recipes,
                }))}
              />
            ) : (
              <p className="text-sm text-neutral-400">No tags yet.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
