import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getRecipeDetail } from "@/lib/recipes";
import { tagLabel } from "@/lib/taxonomy";
import { RatingWidget } from "./rating-widget";
import { NotesEditor } from "./notes-editor";
import { CookLogSection } from "./cook-log-section";
import { PhotoGallery } from "./photo-gallery";
import { ArchiveButton } from "./archive-button";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const recipe = await getRecipeDetail(user.id, id);
  if (!recipe) notFound();

  const heroPhoto = recipe.photos.find((p) => p.isHero) ?? recipe.photos[0];
  const heroUrl = heroPhoto?.url ?? recipe.heroImageUrl ?? null;

  const ingredientSections = groupBy(recipe.ingredients, (i) => i.section ?? "");
  const numberedSteps = recipe.steps.map((step, i) => ({ ...step, number: i + 1 }));
  const stepSections = groupBy(numberedSteps, (s) => s.section ?? "");

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <Link href="/recipes" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          ← Recipes
        </Link>
      </div>

      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroUrl} alt={recipe.title} className="aspect-video w-full rounded-xl object-cover" />
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{recipe.title}</h1>
          <div className="flex shrink-0 gap-3">
            <Link href={`/recipes/${recipe.id}/edit`} className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Edit
            </Link>
            <ArchiveButton recipeId={recipe.id} />
          </div>
        </div>
        {recipe.description ? <p className="text-neutral-600 dark:text-neutral-400">{recipe.description}</p> : null}
        <RatingWidget recipeId={recipe.id} rating={recipe.rating} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-500">
        {recipe.servingsYield ? (
          <span>
            {Number(recipe.servingsYield)} {recipe.servingsUnit ?? "servings"}
          </span>
        ) : null}
        {recipe.prepMinutes ? <span>Prep {recipe.prepMinutes} min</span> : null}
        {recipe.cookMinutes ? <span>Cook {recipe.cookMinutes} min</span> : null}
        {recipe.totalMinutes ? <span>Total {recipe.totalMinutes} min</span> : null}
      </div>

      {recipe.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((rt) => (
            <span
              key={rt.tagId}
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
            >
              {tagLabel(rt.tag.facet, rt.tag.name)}
            </span>
          ))}
        </div>
      ) : null}

      {(recipe.sourceUrl || recipe.sourceName || recipe.sourceAuthor) ? (
        <p className="text-sm text-neutral-500">
          Source:{" "}
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {recipe.sourceName ?? recipe.sourceUrl}
            </a>
          ) : (
            recipe.sourceName
          )}
          {recipe.sourceAuthor ? ` — ${recipe.sourceAuthor}` : ""}
        </p>
      ) : null}

      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_2fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Ingredients</h2>
          <div className="flex flex-col gap-4">
            {Object.entries(ingredientSections).map(([section, lines]) => (
              <div key={section || "_"}>
                {section ? <h3 className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">{section}</h3> : null}
                <ul className="flex flex-col gap-1.5">
                  {lines.map((line) => (
                    <li key={line.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                      <span className={line.isOptional ? "text-neutral-500" : ""}>
                        {line.rawText}
                        {line.isOptional ? " (optional)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Steps</h2>
          <div className="flex flex-col gap-5">
            {Object.entries(stepSections).map(([section, lines]) => (
              <div key={section || "_"}>
                {section ? <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">{section}</h3> : null}
                <ol className="flex flex-col gap-3">
                  {lines.map((step) => (
                    <li key={step.id} className="flex gap-3 text-sm">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium dark:bg-neutral-900">
                        {step.number}
                      </span>
                      <span>
                        {step.text}
                        {step.timerSeconds ? (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            {formatDuration(step.timerSeconds)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Your notes</h2>
        <NotesEditor recipeId={recipe.id} initialNotes={recipe.notes ?? ""} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Cook log</h2>
        <CookLogSection
          recipeId={recipe.id}
          logs={recipe.cookLogs.map((l) => ({ id: l.id, cookedOn: l.cookedOn.toISOString(), notes: l.notes }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Photos</h2>
        <PhotoGallery recipeId={recipe.id} photos={recipe.photos} />
      </section>
    </div>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

function formatDuration(seconds: number) {
  if (seconds >= 3600) {
    const hours = Math.round((seconds / 3600) * 10) / 10;
    return `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  }
  return `${seconds}s`;
}
