import { TagFacet } from "@/generated/prisma/enums";

/**
 * Seed tag taxonomy (design doc section 6). `name` is the stable slug
 * stored in the database and matched against by the (future) auto-tagger;
 * `label` is what the UI shows. CUSTOM has no seed vocabulary — it's
 * free-form, user-created tags only.
 */
export const SEED_TAXONOMY: Record<Exclude<TagFacet, "CUSTOM">, { name: string; label: string }[]> = {
  METHOD: [
    { name: "crockpot", label: "Crockpot / Slow Cooker" },
    { name: "instant-pot", label: "Instant Pot / Pressure Cooker" },
    { name: "grill", label: "Grill" },
    { name: "smoker", label: "Smoker" },
    { name: "oven", label: "Oven / Bake" },
    { name: "roast", label: "Roast" },
    { name: "stovetop", label: "Stovetop" },
    { name: "air-fryer", label: "Air Fryer" },
    { name: "sous-vide", label: "Sous Vide" },
    { name: "no-cook", label: "No-Cook" },
    { name: "one-pot", label: "One-Pot" },
    { name: "sheet-pan", label: "Sheet Pan" },
  ],
  MAIN: [
    { name: "chicken", label: "Chicken" },
    { name: "beef", label: "Beef" },
    { name: "pork", label: "Pork" },
    { name: "seafood", label: "Seafood" },
    { name: "fish", label: "Fish" },
    { name: "eggs", label: "Eggs" },
    { name: "pasta", label: "Pasta" },
    { name: "rice", label: "Rice" },
    { name: "beans", label: "Beans / Legumes" },
    { name: "vegetable", label: "Vegetable" },
    { name: "cheese", label: "Cheese" },
    { name: "bread", label: "Bread / Dough" },
  ],
  MEAL: [
    { name: "breakfast", label: "Breakfast" },
    { name: "lunch", label: "Lunch" },
    { name: "dinner", label: "Dinner" },
    { name: "side", label: "Side" },
    { name: "appetizer", label: "Appetizer" },
    { name: "dessert", label: "Dessert" },
    { name: "snack", label: "Snack" },
    { name: "sauce", label: "Sauce / Condiment" },
    { name: "drink", label: "Drink" },
  ],
  CUISINE: [
    { name: "italian", label: "Italian" },
    { name: "mexican", label: "Mexican" },
    { name: "chinese", label: "Chinese" },
    { name: "thai", label: "Thai" },
    { name: "indian", label: "Indian" },
    { name: "japanese", label: "Japanese" },
    { name: "mediterranean", label: "Mediterranean" },
    { name: "american", label: "American" },
    { name: "bbq", label: "BBQ" },
    { name: "cajun", label: "Cajun" },
    { name: "korean", label: "Korean" },
    { name: "french", label: "French" },
  ],
  EFFORT: [
    { name: "weeknight", label: "Weeknight (≤45 min)" },
    { name: "project", label: "Project (>2 hr)" },
    { name: "make-ahead", label: "Make-Ahead" },
    { name: "freezer-friendly", label: "Freezer-Friendly" },
    { name: "minimal-cleanup", label: "Minimal Cleanup" },
  ],
  SEASON: [
    { name: "summer", label: "Summer" },
    { name: "fall", label: "Fall" },
    { name: "winter", label: "Winter" },
    { name: "spring", label: "Spring" },
    { name: "holiday", label: "Holiday" },
  ],
};

export const TAG_FACETS: TagFacet[] = [
  "METHOD",
  "MAIN",
  "MEAL",
  "CUISINE",
  "EFFORT",
  "SEASON",
  "CUSTOM",
];

export const FACET_LABELS: Record<TagFacet, string> = {
  METHOD: "Method",
  MAIN: "Main ingredient",
  MEAL: "Meal",
  CUISINE: "Cuisine",
  EFFORT: "Effort",
  SEASON: "Season",
  CUSTOM: "Custom",
};

/** EFFORT is derived from total_minutes in code, not guessed by a model (section 6). */
export function deriveEffortTagNames(totalMinutes: number | null | undefined): string[] {
  if (totalMinutes == null) return [];
  if (totalMinutes <= 45) return ["weeknight"];
  if (totalMinutes > 120) return ["project"];
  return [];
}

export function tagLabel(facet: TagFacet, name: string): string {
  if (facet === "CUSTOM") return name;
  const seeded = SEED_TAXONOMY[facet]?.find((t) => t.name === name);
  if (seeded) return seeded.label;
  return name;
}
