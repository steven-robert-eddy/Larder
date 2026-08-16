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
