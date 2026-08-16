"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { deriveEffortTagNames } from "@/lib/taxonomy";
import { parseRecipeFormData, type RecipeFormState } from "./form-schema";
import type { RecipeFormValues } from "@/lib/validation";

async function resolveTagCreateInputs(userId: string, values: RecipeFormValues) {
  const hasPrepOrCook = values.prepMinutes != null || values.cookMinutes != null;
  const totalMinutes =
    values.totalMinutes ?? (hasPrepOrCook ? (values.prepMinutes ?? 0) + (values.cookMinutes ?? 0) : undefined);
  const effortNames = deriveEffortTagNames(totalMinutes ?? null);

  const derivedTags = effortNames.length
    ? await prisma.tag.findMany({
        where: { userId, facet: "EFFORT", name: { in: effortNames } },
      })
    : [];

  const userTagIds = new Set(values.tagIds);
  const tagCreates: { tagId: string; appliedBy: "USER" | "AUTO" }[] = [
    ...values.tagIds.map((tagId) => ({ tagId, appliedBy: "USER" as const })),
    ...derivedTags.filter((t) => !userTagIds.has(t.id)).map((t) => ({ tagId: t.id, appliedBy: "AUTO" as const })),
  ];

  return { totalMinutes, tagCreates };
}

export async function createRecipeAction(
  _prevState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const user = await requireUser();
  const parsed = parseRecipeFormData(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }

  const values = parsed.data;
  const { totalMinutes, tagCreates } = await resolveTagCreateInputs(user.id, values);

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: values.title,
      description: values.description,
      servingsYield: values.servingsYield,
      servingsUnit: values.servingsUnit,
      prepMinutes: values.prepMinutes,
      cookMinutes: values.cookMinutes,
      totalMinutes,
      sourceType: values.sourceType,
      sourceUrl: values.sourceUrl,
      sourceName: values.sourceName,
      sourceAuthor: values.sourceAuthor,
      notes: values.notes,
      ingredients: {
        create: values.ingredients.map((ing, i) => ({ ...ing, position: i })),
      },
      steps: {
        create: values.steps.map((step, i) => ({ ...step, position: i })),
      },
      tags: { create: tagCreates },
    },
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipeAction(
  recipeId: string,
  _prevState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const user = await requireUser();
  const existing = await prisma.recipe.findFirst({ where: { id: recipeId, userId: user.id } });
  if (!existing) return { error: "Recipe not found." };

  const parsed = parseRecipeFormData(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }

  const values = parsed.data;
  const { totalMinutes, tagCreates } = await resolveTagCreateInputs(user.id, values);

  await prisma.$transaction([
    prisma.ingredientLine.deleteMany({ where: { recipeId } }),
    prisma.step.deleteMany({ where: { recipeId } }),
    prisma.recipeTag.deleteMany({ where: { recipeId } }),
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: values.title,
        description: values.description,
        servingsYield: values.servingsYield,
        servingsUnit: values.servingsUnit,
        prepMinutes: values.prepMinutes,
        cookMinutes: values.cookMinutes,
        totalMinutes,
        sourceType: values.sourceType,
        sourceUrl: values.sourceUrl,
        sourceName: values.sourceName,
        sourceAuthor: values.sourceAuthor,
        notes: values.notes,
        ingredients: { create: values.ingredients.map((ing, i) => ({ ...ing, position: i })) },
        steps: { create: values.steps.map((step, i) => ({ ...step, position: i })) },
        tags: { create: tagCreates },
      },
    }),
  ]);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function archiveRecipeAction(recipeId: string) {
  const user = await requireUser();
  await prisma.recipe.updateMany({
    where: { id: recipeId, userId: user.id },
    data: { isArchived: true },
  });
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function setRatingAction(recipeId: string, rating: number | null) {
  const user = await requireUser();
  await prisma.recipe.updateMany({
    where: { id: recipeId, userId: user.id },
    data: { rating },
  });
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
}

export async function updateNotesAction(recipeId: string, notes: string) {
  const user = await requireUser();
  await prisma.recipe.updateMany({
    where: { id: recipeId, userId: user.id },
    data: { notes: notes.trim() || null },
  });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function addCookLogAction(recipeId: string, formData: FormData) {
  const user = await requireUser();
  const owns = await prisma.recipe.findFirst({ where: { id: recipeId, userId: user.id } });
  if (!owns) return;

  const cookedOnRaw = String(formData.get("cookedOn") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const cookedOn = cookedOnRaw ? new Date(cookedOnRaw) : new Date();

  await prisma.cookLog.create({
    data: { recipeId, cookedOn, notes: notes || null },
  });
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
}

export async function deleteCookLogAction(recipeId: string, cookLogId: string) {
  const user = await requireUser();
  const owns = await prisma.recipe.findFirst({ where: { id: recipeId, userId: user.id } });
  if (!owns) return;
  await prisma.cookLog.delete({ where: { id: cookLogId } });
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
}

export async function addPhotoAction(recipeId: string, url: string, caption?: string) {
  const user = await requireUser();
  const owns = await prisma.recipe.findFirst({ where: { id: recipeId, userId: user.id } });
  if (!owns) return;

  const existingHero = await prisma.recipePhoto.findFirst({ where: { recipeId, isHero: true } });
  await prisma.recipePhoto.create({
    data: { recipeId, url, caption: caption || null, isHero: !existingHero },
  });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function setHeroPhotoAction(recipeId: string, photoId: string) {
  const user = await requireUser();
  const owns = await prisma.recipe.findFirst({ where: { id: recipeId, userId: user.id } });
  if (!owns) return;

  await prisma.$transaction([
    prisma.recipePhoto.updateMany({ where: { recipeId }, data: { isHero: false } }),
    prisma.recipePhoto.updateMany({ where: { id: photoId, recipeId }, data: { isHero: true } }),
  ]);
  revalidatePath(`/recipes/${recipeId}`);
}

export async function deletePhotoAction(recipeId: string, photoId: string) {
  const user = await requireUser();
  const owns = await prisma.recipe.findFirst({ where: { id: recipeId, userId: user.id } });
  if (!owns) return;
  await prisma.recipePhoto.deleteMany({ where: { id: photoId, recipeId } });
  revalidatePath(`/recipes/${recipeId}`);
}

function flattenZodErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
