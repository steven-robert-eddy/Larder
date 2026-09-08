import type { z } from "zod";
import { recipeFormSchema } from "@/lib/validation";

export type RecipeFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export function parseRecipeFormData(formData: FormData) {
  const raw = {
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    servingsYield: formData.get("servingsYield") ?? "",
    servingsUnit: formData.get("servingsUnit") ?? "",
    prepMinutes: formData.get("prepMinutes") ?? "",
    cookMinutes: formData.get("cookMinutes") ?? "",
    totalMinutes: formData.get("totalMinutes") ?? "",
    sourceType: formData.get("sourceType") ?? "MANUAL",
    sourceUrl: formData.get("sourceUrl") ?? "",
    sourceName: formData.get("sourceName") ?? "",
    sourceAuthor: formData.get("sourceAuthor") ?? "",
    notes: formData.get("notes") ?? "",
    ingredients: JSON.parse(String(formData.get("ingredientsJson") ?? "[]")),
    steps: JSON.parse(String(formData.get("stepsJson") ?? "[]")),
    tagIds: JSON.parse(String(formData.get("tagIdsJson") ?? "[]")),
  };

  return recipeFormSchema.safeParse(raw);
}

export function flattenZodErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
