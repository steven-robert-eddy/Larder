import { requireUser } from "@/lib/session";
import { listTagsForUser } from "@/lib/tags";
import { RecipeForm } from "../recipe-form";
import { defaultRecipeFormValues } from "../recipe-form-types";
import { createRecipeAction } from "../actions";

export default async function NewRecipePage() {
  const user = await requireUser();
  const tags = await listTagsForUser(user.id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">New recipe</h1>
      <RecipeForm
        action={createRecipeAction}
        initialValues={defaultRecipeFormValues()}
        availableTags={tags}
        submitLabel="Save recipe"
      />
    </div>
  );
}
