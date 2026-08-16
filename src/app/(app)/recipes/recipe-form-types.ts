import type { IngredientFormValues, StepFormValues } from "@/lib/validation";
import type { TagFacet } from "@/generated/prisma/enums";

export type FormTag = { id: string; facet: TagFacet; name: string };

export type RecipeFormInitialValues = {
  title: string;
  description: string;
  servingsYield: string;
  servingsUnit: string;
  prepMinutes: string;
  cookMinutes: string;
  totalMinutes: string;
  sourceType: "WEB" | "INSTAGRAM" | "COOKBOOK" | "MANUAL";
  sourceUrl: string;
  sourceName: string;
  sourceAuthor: string;
  notes: string;
  ingredients: IngredientFormValues[];
  steps: StepFormValues[];
  tagIds: string[];
};

export const EMPTY_INGREDIENT: IngredientFormValues = {
  rawText: "",
  section: undefined,
  quantity: undefined,
  quantityMax: undefined,
  unit: undefined,
  item: undefined,
  preparation: undefined,
  isOptional: false,
};

export const EMPTY_STEP: StepFormValues = { text: "", section: undefined, timerSeconds: undefined };

export function defaultRecipeFormValues(): RecipeFormInitialValues {
  return {
    title: "",
    description: "",
    servingsYield: "",
    servingsUnit: "servings",
    prepMinutes: "",
    cookMinutes: "",
    totalMinutes: "",
    sourceType: "MANUAL",
    sourceUrl: "",
    sourceName: "",
    sourceAuthor: "",
    notes: "",
    ingredients: [{ ...EMPTY_INGREDIENT }],
    steps: [{ ...EMPTY_STEP }],
    tagIds: [],
  };
}
