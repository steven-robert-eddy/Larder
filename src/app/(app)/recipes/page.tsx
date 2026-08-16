import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listRecipes, type RecipeSort, type RecipeView } from "@/lib/recipes";
import { listTagsForUser } from "@/lib/tags";
import { FilterBar } from "./filter-bar";
import { RecipeCard } from "./recipe-card";
import type { TagFacet } from "@/generated/prisma/enums";

const VALID_SORTS: RecipeSort[] = ["recent", "rating", "lastCooked", "alpha"];
const VALID_FACETS: TagFacet[] = ["METHOD", "MAIN", "MEAL", "CUISINE", "EFFORT", "SEASON", "CUSTOM"];

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : undefined;
  const sortParam = typeof params.sort === "string" ? params.sort : "recent";
  const sort = VALID_SORTS.includes(sortParam as RecipeSort) ? (sortParam as RecipeSort) : "recent";
  const view: RecipeView = params.view === "list" ? "list" : "grid";
  const neverCooked = params.never === "1";
  const notCookedInDays = params.stale === "1" ? 90 : undefined;

  const facets: Partial<Record<TagFacet, string[]>> = {};
  for (const facet of VALID_FACETS) {
    const key = `facet_${facet}`;
    const raw = params[key];
    if (!raw) continue;
    facets[facet] = Array.isArray(raw) ? raw : [raw];
  }

  const [recipes, tags] = await Promise.all([
    listRecipes(user.id, { search: q, sort, facets, neverCooked, notCookedInDays }),
    listTagsForUser(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <Link
          href="/recipes/new"
          className="hidden rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white sm:block dark:bg-neutral-100 dark:text-neutral-900"
        >
          + New recipe
        </Link>
      </div>

      <FilterBar tags={tags} />

      {recipes.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          No recipes match yet. Try clearing a filter, or add your first recipe.
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} view="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} view="list" />
          ))}
        </div>
      )}

      <Link
        href="/recipes/new"
        aria-label="New recipe"
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-neutral-900 text-2xl text-white shadow-lg sm:hidden dark:bg-neutral-100 dark:text-neutral-900"
      >
        +
      </Link>
    </div>
  );
}
