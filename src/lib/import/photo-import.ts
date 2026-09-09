import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { extractRecipeFromImages, AiExtractionError, type ScreenshotImage } from "./ai-extract";

export type PhotoImportOutcome = { jobId: string; status: "NEEDS_REVIEW" | "FAILED" };

export type StoredPhotoPayload = Awaited<ReturnType<typeof extractRecipeFromImages>> & {
  extraction_method: "ai";
};

/**
 * Screenshot-based import — for captions too long to fit (or select) on
 * one screen, which paste-a-blob and the share targets can't help with.
 * Screenshots aren't persisted (the originals stay in the user's camera
 * roll); only extracted here, so a failure lands on a blank review
 * rather than a discarded job — never a dead end, per design doc section
 * 12 — it just can't offer a "retry with the original" box the way
 * paste-import's rawPayload.text does.
 */
export async function runPhotoImport(userId: string, images: ScreenshotImage[]): Promise<PhotoImportOutcome> {
  const job = await prisma.importJob.create({
    data: { userId, kind: "PHOTO", status: "RUNNING" },
  });

  try {
    const extracted = await extractRecipeFromImages(images);
    const payload: StoredPhotoPayload = { ...extracted, extraction_method: "ai" };
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "NEEDS_REVIEW", parsedPayload: payload satisfies Prisma.InputJsonValue },
    });
  } catch (err) {
    if (!(err instanceof AiExtractionError)) throw err;
    console.error(`Photo extraction failed for import job ${job.id}:`, err.message);
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "NEEDS_REVIEW", errorMessage: err.message },
    });
  }

  return { jobId: job.id, status: "NEEDS_REVIEW" };
}
