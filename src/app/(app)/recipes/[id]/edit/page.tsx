import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listTagsForUser } from "@/lib/tags";
import { getRecipeDetail } from "@/lib/recipes";
import { RecipeForm, type RecipeFormInitialValues } from "../../recipe-form";
import { updateRecipeAction } from "../../actions";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [recipe, tags] = await Promise.all([getRecipeDetail(user.id, id), listTagsForUser(user.id)]);

  if (!recipe) notFound();

  const initialValues: RecipeFormInitialValues = {
    title: recipe.title,
    description: recipe.description ?? "",
    servingsYield: recipe.servingsYield?.toString() ?? "",
    servingsUnit: recipe.servingsUnit ?? "servings",
    prepMinutes: recipe.prepMinutes?.toString() ?? "",
    cookMinutes: recipe.cookMinutes?.toString() ?? "",
    totalMinutes: recipe.totalMinutes?.toString() ?? "",
    sourceType: recipe.sourceType,
    sourceUrl: recipe.sourceUrl ?? "",
    sourceName: recipe.sourceName ?? "",
    sourceAuthor: recipe.sourceAuthor ?? "",
    notes: recipe.notes ?? "",
    ingredients: recipe.ingredients.map((ing) => ({
      section: ing.section ?? undefined,
      rawText: ing.rawText,
      quantity: ing.quantity != null ? Number(ing.quantity) : undefined,
      quantityMax: ing.quantityMax != null ? Number(ing.quantityMax) : undefined,
      unit: ing.unit ?? undefined,
      item: ing.item ?? undefined,
      preparation: ing.preparation ?? undefined,
      isOptional: ing.isOptional,
    })),
    steps: recipe.steps.map((s) => ({
      section: s.section ?? undefined,
      text: s.text,
      timerSeconds: s.timerSeconds ?? undefined,
    })),
    tagIds: recipe.tags.filter((t) => t.appliedBy === "USER").map((t) => t.tagId),
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Edit recipe</h1>
      <RecipeForm
        action={updateRecipeAction.bind(null, id)}
        initialValues={initialValues}
        availableTags={tags}
        submitLabel="Save changes"
      />
    </div>
  );
}
