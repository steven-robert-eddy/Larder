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
 */
export async function runPasteImport(userId: string, text: string): Promise<PasteImportOutcome> {
  const job = await prisma.importJob.create({
    data: { userId, kind: "PASTE", status: "RUNNING" },
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
