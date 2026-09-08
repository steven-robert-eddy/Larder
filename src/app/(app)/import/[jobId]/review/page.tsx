import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listTagsForUser } from "@/lib/tags";
import { RecipeForm } from "../../../recipes/recipe-form";
import { defaultRecipeFormValues, EMPTY_INGREDIENT, EMPTY_STEP, type RecipeFormInitialValues } from "../../../recipes/recipe-form-types";
import { confirmImportAction } from "../../actions";
import { DiscardButton } from "./discard-button";
import type { WebExtractionResult } from "@/lib/import/json-ld";

type StoredWebPayload = WebExtractionResult & {
  source_url: string;
  source_name: string;
  stored_hero_image_url: string | null;
};

export default async function ImportReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireUser();

  const job = await prisma.importJob.findFirst({ where: { id: jobId, userId: user.id } });
  if (!job) notFound();

  if (job.status === "DONE" && job.recipeId) {
    redirect(`/recipes/${job.recipeId}`);
  }

  if (job.status === "FAILED") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {job.errorMessage ?? "That import failed."}
        </p>
        <Link href="/import" className="text-sm underline">
          Try another URL
        </Link>
      </div>
    );
  }

  const payload = job.parsedPayload as StoredWebPayload | null;
  const tags = await listTagsForUser(user.id);
  const initialValues = toInitialValues(payload, job.inputUrl);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Review import</h1>
          {payload ? (
            <p className="mt-1 text-sm text-neutral-500">
              Pulled from <span className="font-medium">{payload.source_name}</span> — check everything
              below before saving.
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Couldn&apos;t find recipe data on that page. The page loaded fine, but nothing matched — fill
              in what you can below, or discard and try a different source.
            </p>
          )}
        </div>
        <DiscardButton jobId={jobId} />
      </div>

      {payload?.stored_hero_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={payload.stored_hero_image_url}
          alt=""
          className="mb-6 aspect-video w-full rounded-xl object-cover"
        />
      ) : null}

      <RecipeForm
        action={confirmImportAction.bind(null, jobId)}
        initialValues={initialValues}
        availableTags={tags}
        submitLabel="Save recipe"
      />
    </div>
  );
}

function toInitialValues(payload: StoredWebPayload | null, inputUrl: string | null): RecipeFormInitialValues {
  if (!payload) {
    return {
      ...defaultRecipeFormValues(),
      sourceType: "WEB",
      sourceUrl: inputUrl ?? "",
    };
  }

  return {
    title: payload.title,
    description: payload.description ?? "",
    servingsYield: payload.servings_yield != null ? String(payload.servings_yield) : "",
    servingsUnit: payload.servings_unit ?? "servings",
    prepMinutes: payload.prep_minutes != null ? String(payload.prep_minutes) : "",
    cookMinutes: payload.cook_minutes != null ? String(payload.cook_minutes) : "",
    totalMinutes: payload.total_minutes != null ? String(payload.total_minutes) : "",
    sourceType: "WEB",
    sourceUrl: payload.source_url || inputUrl || "",
    sourceName: payload.source_name ?? "",
    sourceAuthor: payload.source_author ?? "",
    notes: "",
    ingredients:
      payload.ingredients.length > 0
        ? payload.ingredients.map((ing) => ({
            section: ing.section ?? undefined,
            rawText: ing.raw_text,
            quantity: ing.quantity ?? undefined,
            quantityMax: ing.quantity_max ?? undefined,
            unit: ing.unit ?? undefined,
            item: ing.item ?? undefined,
            preparation: ing.preparation ?? undefined,
            isOptional: ing.is_optional,
          }))
        : [{ ...EMPTY_INGREDIENT }],
    steps:
      payload.steps.length > 0
        ? payload.steps.map((s) => ({
            section: s.section ?? undefined,
            text: s.text,
            timerSeconds: s.timer_seconds ?? undefined,
          }))
        : [{ ...EMPTY_STEP }],
    tagIds: [],
  };
}
