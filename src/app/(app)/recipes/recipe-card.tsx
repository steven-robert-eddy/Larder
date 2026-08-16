import Link from "next/link";
import type { RecipeListItem, RecipeView } from "@/lib/recipes";

export function RecipeCard({ recipe, view }: { recipe: RecipeListItem; view: RecipeView }) {
  const heroUrl = recipe.photos[0]?.url ?? recipe.heroImageUrl ?? null;

  if (view === "list") {
    return (
      <Link
        href={`/recipes/${recipe.id}`}
        className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800"
      >
        <div className="size-14 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-neutral-900 dark:text-neutral-50">{recipe.title}</p>
          <p className="truncate text-sm text-neutral-500">{metaLine(recipe)}</p>
        </div>
        {recipe.rating ? <span className="shrink-0 text-sm text-amber-500">★ {recipe.rating}</span> : null}
      </Link>
    );
  }

  return (
    <Link href={`/recipes/${recipe.id}`} className="flex flex-col gap-1.5">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-300 dark:text-neutral-700">
            <BookIcon />
          </div>
        )}
      </div>
      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{recipe.title}</p>
      <p className="truncate text-xs text-neutral-500">{metaLine(recipe)}</p>
    </Link>
  );
}

function metaLine(recipe: RecipeListItem) {
  const parts: string[] = [];
  if (recipe.rating) parts.push(`★ ${recipe.rating}`);
  if (recipe.totalMinutes) parts.push(`${recipe.totalMinutes} min`);
  parts.push(recipe.timesMade > 0 ? `made ${recipe.timesMade}×` : "never made");
  return parts.join(" · ");
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-10">
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" strokeLinejoin="round" />
      <path d="M20 5.5c0-.83-.67-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" strokeLinejoin="round" />
    </svg>
  );
}
