"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { runWebImport } from "@/lib/import/web-import";
import { runPasteImport, retryPasteImport } from "@/lib/import/paste-import";
import { runPhotoImport } from "@/lib/import/photo-import";
import type { ScreenshotImage } from "@/lib/import/ai-extract";
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

export type PhotoImportFormState = { error: string | null };

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5_000_000;
const ALLOWED_PHOTO_TYPES: Record<string, ScreenshotImage["mediaType"]> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

export async function createPhotoImportAction(
  _prevState: PhotoImportFormState,
  formData: FormData,
): Promise<PhotoImportFormState> {
  const user = await requireUser();

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Add at least one screenshot first." };
  if (files.length > MAX_PHOTOS) return { error: `That's too many at once — up to ${MAX_PHOTOS} screenshots.` };

  const images: ScreenshotImage[] = [];
  for (const file of files) {
    const mediaType = ALLOWED_PHOTO_TYPES[file.type];
    if (!mediaType) return { error: `${file.name || "One of those files"} isn't a supported image type.` };
    if (file.size > MAX_PHOTO_BYTES) return { error: `${file.name || "One of those screenshots"} is too large.` };

    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({ base64: buffer.toString("base64"), mediaType });
  }

  const outcome = await runPhotoImport(user.id, images);
  redirect(`/import/${outcome.jobId}/review`);
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
