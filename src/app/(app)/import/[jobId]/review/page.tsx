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
import type { StoredPastePayload } from "@/lib/import/paste-import";

type StoredWebPayload = WebExtractionResult & {
  source_url: string;
  source_name: string;
  stored_hero_image_url: string | null;
  extraction_method: "structured" | "ai";
};

type ReviewPayload = StoredWebPayload | StoredPastePayload;

function isWebPayload(payload: ReviewPayload): payload is StoredWebPayload {
  return "source_url" in payload;
}

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

  const payload = job.parsedPayload as ReviewPayload | null;
  const rawText = job.kind === "PASTE" ? (job.rawPayload as { text?: string } | null)?.text : null;
  const tags = await listTagsForUser(user.id);
  const initialValues = toInitialValues(payload, job.kind, job.inputUrl);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Review import</h1>
          {payload && isWebPayload(payload) ? (
            <p className="mt-1 text-sm text-neutral-500">
              Pulled from <span className="font-medium">{payload.source_name}</span> — check everything
              below before saving.
            </p>
          ) : payload ? (
            <p className="mt-1 text-sm text-neutral-500">
              AI-assisted extraction from your pasted text — check everything below before saving.
            </p>
          ) : job.kind === "PASTE" && rawText ? (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Couldn&apos;t extract a recipe from that text. Your original paste is below — fill in
              the form by hand, or discard and try again.
            </p>
          ) : job.kind === "PASTE" ? (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              That share only included a link, not the caption text — Instagram usually doesn&apos;t
              expose captions to the share sheet. The link is saved below; paste the caption in by
              hand, or fill in the form yourself.
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Couldn&apos;t find recipe data on that page. The page loaded fine, but nothing matched — fill
              in what you can below, or discard and try a different source.
            </p>
          )}
          {payload && isWebPayload(payload) && payload.extraction_method === "ai" ? (
            <p className="mt-1 text-xs text-neutral-400">
              This page had no structured recipe data, so AI pulled these out instead — worth a closer look.
            </p>
          ) : null}
        </div>
        <DiscardButton jobId={jobId} />
      </div>

      {rawText ? (
        <details className="mb-6 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <summary className="cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Your original paste
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-neutral-500">{rawText}</pre>
        </details>
      ) : null}

      {payload && isWebPayload(payload) && payload.stored_hero_image_url ? (
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

/** Instagram links can arrive via the share target or a pasted caption — attribute them correctly either way (design doc section 5.2: always keep source_url so the original post can be reopened). */
function pasteSourceType(url: string | null): "INSTAGRAM" | "MANUAL" {
  if (!url) return "MANUAL";
  try {
    return new URL(url).hostname.replace(/^www\./, "") === "instagram.com" ? "INSTAGRAM" : "MANUAL";
  } catch {
    return "MANUAL";
  }
}

function toInitialValues(
  payload: ReviewPayload | null,
  kind: string,
  inputUrl: string | null,
): RecipeFormInitialValues {
  if (!payload) {
    return {
      ...defaultRecipeFormValues(),
      sourceType: kind === "PASTE" ? pasteSourceType(inputUrl) : "WEB",
      sourceUrl: inputUrl ?? "",
    };
  }

  const web = isWebPayload(payload) ? payload : null;

  return {
    title: payload.title,
    description: payload.description ?? "",
    servingsYield: payload.servings_yield != null ? String(payload.servings_yield) : "",
    servingsUnit: payload.servings_unit ?? "servings",
    prepMinutes: payload.prep_minutes != null ? String(payload.prep_minutes) : "",
    cookMinutes: payload.cook_minutes != null ? String(payload.cook_minutes) : "",
    totalMinutes: payload.total_minutes != null ? String(payload.total_minutes) : "",
    sourceType: web ? "WEB" : pasteSourceType(inputUrl),
    sourceUrl: web ? web.source_url || inputUrl || "" : inputUrl ?? "",
    sourceName: web?.source_name ?? "",
    sourceAuthor: web?.source_author ?? "",
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
