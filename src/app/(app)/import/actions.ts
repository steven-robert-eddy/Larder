"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { runWebImport } from "@/lib/import/web-import";
import { runPasteImport, retryPasteImport } from "@/lib/import/paste-import";
import { buildRecipeCreateInput } from "../recipes/actions";
import { parseRecipeFormData, flattenZodErrors, type RecipeFormState } from "../recipes/form-schema";

export type ImportUrlFormState = { error: string | null };

export async function createWebImportAction(
  _prevState: ImportUrlFormState,
  formData: FormData,
): Promise<ImportUrlFormState> {
  const user = await requireUser();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "Paste a URL first." };

  const outcome = await runWebImport(user.id, url);

  if (outcome.status === "FAILED") {
    const job = await prisma.importJob.findFirst({ where: { id: outcome.jobId, userId: user.id } });
    return { error: job?.errorMessage ?? "Could not import that page." };
  }

  redirect(`/import/${outcome.jobId}/review`);
}

export type PasteImportFormState = { error: string | null };

export async function createPasteImportAction(
  _prevState: PasteImportFormState,
  formData: FormData,
): Promise<PasteImportFormState> {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Paste some recipe text first." };

  const outcome = await runPasteImport(user.id, text);
  redirect(`/import/${outcome.jobId}/review`);
}

export async function retryPasteImportAction(
  jobId: string,
  _prevState: PasteImportFormState,
  formData: FormData,
): Promise<PasteImportFormState> {
  const user = await requireUser();
  const job = await prisma.importJob.findFirst({ where: { id: jobId, userId: user.id, kind: "PASTE" } });
  if (!job) return { error: "Import not found." };

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Paste the caption first." };

  await retryPasteImport(jobId, text);
  revalidatePath(`/import/${jobId}/review`);
  redirect(`/import/${jobId}/review`);
}

export async function confirmImportAction(
  jobId: string,
  _prevState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const user = await requireUser();
  const job = await prisma.importJob.findFirst({ where: { id: jobId, userId: user.id } });
  if (!job) return { error: "Import not found." };

  const parsed = parseRecipeFormData(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }

  const payload = job.parsedPayload as { stored_hero_image_url?: string | null } | null;

  const recipe = await prisma.recipe.create({
    data: await buildRecipeCreateInput(user.id, parsed.data, {
      heroImageUrl: payload?.stored_hero_image_url ?? null,
    }),
  });

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "DONE", recipeId: recipe.id },
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function discardImportAction(jobId: string) {
  const user = await requireUser();
  await prisma.importJob.deleteMany({ where: { id: jobId, userId: user.id } });
  redirect("/import");
}
