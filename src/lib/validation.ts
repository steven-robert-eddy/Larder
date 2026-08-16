import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional();

const optionalNumber = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const trimmed = v.trim();
    if (trimmed.length === 0) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  })
  .optional();

export const ingredientSchema = z.object({
  section: optionalString,
  rawText: z.string().trim().min(1, "Ingredient text is required"),
  quantity: optionalNumber,
  quantityMax: optionalNumber,
  unit: optionalString,
  item: optionalString,
  preparation: optionalString,
  isOptional: z.boolean().default(false),
});

export const stepSchema = z.object({
  section: optionalString,
  text: z.string().trim().min(1, "Step text is required"),
  timerSeconds: optionalNumber,
});

export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalString,
  servingsYield: optionalNumber,
  servingsUnit: optionalString,
  prepMinutes: optionalNumber,
  cookMinutes: optionalNumber,
  totalMinutes: optionalNumber,
  sourceType: z.enum(["WEB", "INSTAGRAM", "COOKBOOK", "MANUAL"]).default("MANUAL"),
  sourceUrl: optionalString,
  sourceName: optionalString,
  sourceAuthor: optionalString,
  notes: optionalString,
  ingredients: z.array(ingredientSchema).min(1, "Add at least one ingredient"),
  steps: z.array(stepSchema).min(1, "Add at least one step"),
  tagIds: z.array(z.string()).default([]),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;
export type IngredientFormValues = z.infer<typeof ingredientSchema>;
export type StepFormValues = z.infer<typeof stepSchema>;
