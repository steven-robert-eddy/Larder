import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { extractRecipeWithAI, AiExtractionError } from "./ai-extract";

export type PasteImportOutcome = { jobId: string; status: "NEEDS_REVIEW" | "FAILED" };

export type StoredPastePayload = Awaited<ReturnType<typeof extractRecipeWithAI>> & {
  extraction_method: "ai";
};

/**
 * Paste-a-blob manual import (design doc section 5.4) — the migration
 * path for the existing notes doc, and for anything the other import
 * paths fumble. No fetch, no HTML — the pasted text goes straight to the
 * same AI extraction interface the web import fallback uses.
 *
 * sourceUrl is optional and stored as-is (design doc section 5.2: "always
 * store source_url so the original post can be reopened") — the share
 * target handler below passes it through when the OS share included one.
 */
export async function runPasteImport(
  userId: string,
  text: string,
  sourceUrl?: string | null,
): Promise<PasteImportOutcome> {
  const job = await prisma.importJob.create({
    data: { userId, kind: "PASTE", status: "RUNNING", inputUrl: sourceUrl ?? null },
  });

  try {
    const extracted = await extractRecipeWithAI(text);
    const payload: StoredPastePayload = { ...extracted, extraction_method: "ai" };
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "NEEDS_REVIEW", parsedPayload: payload satisfies Prisma.InputJsonValue },
    });
  } catch (err) {
    if (!(err instanceof AiExtractionError)) throw err;
    // Never let extraction failure lose data (design doc section 12) — the
    // pasted text is kept so this can still be reviewed and filled in by
    // hand instead of the attempt just disappearing.
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "NEEDS_REVIEW",
        rawPayload: { text } satisfies Prisma.InputJsonValue,
        errorMessage: err.message,
      },
    });
  }

  return { jobId: job.id, status: "NEEDS_REVIEW" };
}

/**
 * Entry point for the OS share sheet (Web Share Target — Android/Chrome
 * only, see manifest.json's share_target). Sharing an Instagram post
 * commonly sends only the post's link, not the caption — the caption
 * isn't reliably exposed to the share sheet — so this can't assume any
 * text arrived. When it didn't, skip the AI call (nothing to extract)
 * and land straight on a blank review with the link preserved, same
 * shape as any other no-data-found import.
 */
export async function runShareTargetImport(
  userId: string,
  shared: { title?: string; text?: string; url?: string },
): Promise<PasteImportOutcome> {
  const blob = [shared.title, shared.text]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n\n");
  const sourceUrl = shared.url?.trim() || null;

  if (!blob) {
    const job = await prisma.importJob.create({
      data: { userId, kind: "PASTE", status: "NEEDS_REVIEW", inputUrl: sourceUrl },
    });
    return { jobId: job.id, status: "NEEDS_REVIEW" };
  }

  return runPasteImport(userId, blob, sourceUrl);
}
