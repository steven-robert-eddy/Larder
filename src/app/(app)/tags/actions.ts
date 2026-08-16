"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createTag, deleteTag } from "@/lib/tags";
import type { TagFacet } from "@/generated/prisma/enums";

export type TagFormState = { error: string | null };

const VALID_FACETS: TagFacet[] = ["METHOD", "MAIN", "MEAL", "CUISINE", "EFFORT", "SEASON", "CUSTOM"];

export async function createTagAction(_prevState: TagFormState, formData: FormData): Promise<TagFormState> {
  const user = await requireUser();
  const facet = String(formData.get("facet") ?? "CUSTOM") as TagFacet;
  const name = String(formData.get("name") ?? "").trim();

  if (!VALID_FACETS.includes(facet)) return { error: "Invalid facet." };
  if (!name) return { error: "Tag name is required." };

  try {
    await createTag(user.id, facet, name);
  } catch {
    return { error: "Could not create tag." };
  }

  revalidatePath("/tags");
  return { error: null };
}

export async function deleteTagAction(tagId: string) {
  const user = await requireUser();
  await deleteTag(user.id, tagId);
  revalidatePath("/tags");
  revalidatePath("/recipes");
}
