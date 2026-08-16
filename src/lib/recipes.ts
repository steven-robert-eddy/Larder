import { prisma } from "@/lib/prisma";
import type { TagFacet } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

export type RecipeSort = "recent" | "rating" | "lastCooked" | "alpha";
export type RecipeView = "grid" | "list";

export type RecipeFilters = {
  search?: string;
  facets?: Partial<Record<TagFacet, string[]>>;
  sort?: RecipeSort;
  neverCooked?: boolean;
  notCookedInDays?: number;
};

export type RecipeListItem = Awaited<ReturnType<typeof listRecipes>>[number];

export async function listRecipes(userId: string, filters: RecipeFilters) {
  let matchingIds: string[] | null = null;

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT DISTINCT r.id
      FROM recipes r
      LEFT JOIN ingredient_lines il ON il.recipe_id = r.id
      WHERE r.user_id = ${userId}
        AND r.is_archived = false
        AND (
          r.search_vector @@ websearch_to_tsquery('english', ${term})
          OR r.title ILIKE '%' || ${term} || '%'
          OR similarity(r.title, ${term}) > 0.25
          OR il.raw_text ILIKE '%' || ${term} || '%'
          OR similarity(il.raw_text, ${term}) > 0.25
        )
    `);
    matchingIds = rows.map((r) => r.id);
    if (matchingIds.length === 0) return [];
  }

  const facetClauses: Prisma.RecipeWhereInput[] = Object.entries(filters.facets ?? {})
    .filter(([, names]) => names && names.length > 0)
    .map(([facet, names]) => ({
      tags: { some: { tag: { facet: facet as TagFacet, name: { in: names as string[] } } } },
    }));

  const recipes = await prisma.recipe.findMany({
    where: {
      userId,
      isArchived: false,
      ...(matchingIds ? { id: { in: matchingIds } } : {}),
      ...(facetClauses.length > 0 ? { AND: facetClauses } : {}),
    },
    include: {
      tags: { include: { tag: true } },
      photos: { where: { isHero: true }, take: 1 },
      cookLogs: { select: { cookedOn: true } },
    },
  });

  const now = Date.now();
  const withStats = recipes.map((r) => {
    const cookedDates = r.cookLogs.map((c) => c.cookedOn.getTime());
    const lastCooked = cookedDates.length > 0 ? new Date(Math.max(...cookedDates)) : null;
    const daysSinceCooked = lastCooked ? (now - lastCooked.getTime()) / 86_400_000 : null;
    return {
      ...r,
      timesMade: cookedDates.length,
      lastCooked,
      daysSinceCooked,
    };
  });

  let filtered = withStats;
  if (filters.neverCooked) {
    filtered = filtered.filter((r) => r.timesMade === 0);
  }
  if (filters.notCookedInDays != null) {
    filtered = filtered.filter(
      (r) => r.daysSinceCooked == null || r.daysSinceCooked >= filters.notCookedInDays!,
    );
  }

  const sort = filters.sort ?? "recent";
  filtered.sort((a, b) => {
    switch (sort) {
      case "rating":
        return (b.rating ?? -1) - (a.rating ?? -1);
      case "lastCooked": {
        const at = a.lastCooked?.getTime() ?? -Infinity;
        const bt = b.lastCooked?.getTime() ?? -Infinity;
        return bt - at;
      }
      case "alpha":
        return a.title.localeCompare(b.title);
      case "recent":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return filtered;
}

export async function getRecipeDetail(userId: string, recipeId: string) {
  return prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: {
      ingredients: { orderBy: { position: "asc" } },
      steps: { orderBy: { position: "asc" } },
      tags: { include: { tag: true } },
      photos: { orderBy: [{ isHero: "desc" }, { createdAt: "desc" }] },
      cookLogs: { orderBy: { cookedOn: "desc" } },
    },
  });
}
