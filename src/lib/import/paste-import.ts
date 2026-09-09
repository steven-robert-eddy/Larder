import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { extractRecipeWithAI, AiExtractionError } from "./ai-extract";

export type PasteImportOutcome = { jobId: string; status: "NEEDS_REVIEW" | "FAILED" };

export type StoredPastePayload = Awaited<ReturnType<typeof extractRecipeWithAI>> & {
  extraction_method: "ai";
};

/**
 * Runs AI extraction against an already-created job and writes the
 * result. Shared by the initial paste/share-target import and by
 * retryPasteImport (the "paste the caption" box shown when a share only
 * carried a link — see design doc section 5.2's paste-primary contract).
 */
async function extractIntoJob(jobId: string, text: string): Promise<void> {
  try {
    const extracted = await extractRecipeWithAI(text);
    const payload: StoredPastePayload = { ...extracted, extraction_method: "ai" };
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "NEEDS_REVIEW", parsedPayload: payload satisfies Prisma.InputJsonValue, errorMessage: null },
    });
  } catch (err) {
    if (!(err instanceof AiExtractionError)) throw err;
    console.error(`Text extraction failed for import job ${jobId}:`, err.message);
    // Never let extraction failure lose data (design doc section 12) — the
    // pasted text is kept so this can still be reviewed and filled in by
    // hand instead of the attempt just disappearing.
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "NEEDS_REVIEW",
        rawPayload: { text } satisfies Prisma.InputJsonValue,
        errorMessage: err.message,
      },
    });
  }
}

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

  await extractIntoJob(job.id, text);

  return { jobId: job.id, status: "NEEDS_REVIEW" };
}

/** A share payload with nothing but a bare link isn't recipe text — matches "https://..." with no other content. */
function isBareUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

type SharedPayload = { title?: string; text?: string; url?: string };

/**
 * Sorts an OS/automation share payload into real caption text vs. a bare
 * link, since the Web Share Target (Android/Chrome, manifest.json's
 * share_target) and the iOS Shortcuts share action (/api/import/share)
 * can't always distinguish "shared a URL" from "shared text" as cleanly
 * as the Web Share Target spec does — a text/title field that's nothing
 * but a bare link is treated the same as no text at all.
 */
function resolveSharedPayload(shared: SharedPayload): { blob: string; sourceUrl: string | null } {
  const blob = [shared.title, shared.text]
    .filter((value): value is string => !!value && !!value.trim() && !isBareUrl(value))
    .join("\n\n");
  const sourceUrl =
    shared.url?.trim() || [shared.title, shared.text].find((v): v is string => Boolean(v && isBareUrl(v))) || null;
  return { blob, sourceUrl };
}

/**
 * Entry point for the Android Web Share Target (/import/share-target) —
 * a full page navigation with no execution-time limit, so it's fine to
 * await the whole extraction before returning: the page redirects
 * straight to a filled-in review screen once this resolves.
 *
 * Sharing an Instagram post commonly hands over only the post's link,
 * not the caption — the caption isn't reliably exposed to the share
 * surface — so this can't assume any real text arrived. When it didn't,
 * skip the AI call (nothing to extract, and no point spending on it) and
 * land straight on a blank review with the link preserved, same shape as
 * any other no-data-found import. The review screen then offers a
 * "paste the caption" box (retryPasteImport, below) rather than a dead
 * end.
 */
export async function runShareTargetImport(userId: string, shared: SharedPayload): Promise<PasteImportOutcome> {
  const { blob, sourceUrl } = resolveSharedPayload(shared);

  if (!blob) {
    const job = await prisma.importJob.create({
      data: { userId, kind: "PASTE", status: "NEEDS_REVIEW", inputUrl: sourceUrl },
    });
    return { jobId: job.id, status: "NEEDS_REVIEW" };
  }

  return runPasteImport(userId, blob, sourceUrl);
}

/**
 * Same as runShareTargetImport, but for /api/import/share (the iOS
 * Shortcuts action) — which does NOT get to take its time. A Share
 * Sheet action runs under a tight iOS execution budget, and waiting for
 * a live Claude API call before responding was observed killing the
 * connection mid-request (client: "network connection was lost";
 * server: "the destination stream closed early") on top of an
 * already-slow VM. The Shortcut no longer reads the response body
 * anyway (see /import/shortcut — it just shows a static confirmation),
 * so there's nothing gained by waiting: create the job and return
 * immediately, let extraction finish in the background, and rely on
 * /import's pending-review list to surface the result once it's done.
 */
export async function queueShareTargetImport(userId: string, shared: SharedPayload): Promise<PasteImportOutcome> {
  const { blob, sourceUrl } = resolveSharedPayload(shared);

  const job = await prisma.importJob.create({
    data: { userId, kind: "PASTE", status: blob ? "RUNNING" : "NEEDS_REVIEW", inputUrl: sourceUrl },
  });

  if (blob) {
    extractIntoJob(job.id, blob).catch(async (err) => {
      // extractIntoJob already handles AiExtractionError internally: this
      // only fires for something unexpected (e.g. a DB error). Without an
      // awaited caller, an uncaught rejection here would otherwise just
      // vanish — and per design doc section 12, a failure must never
      // leave the job stuck instead of landing somewhere reviewable.
      console.error(`Background extraction failed for import job ${job.id}:`, err);
      await prisma.importJob
        .update({
          where: { id: job.id },
          data: { status: "NEEDS_REVIEW", errorMessage: "Extraction failed unexpectedly." },
        })
        .catch(() => {});
    });
  }

  return { jobId: job.id, status: "NEEDS_REVIEW" };
}

/**
 * Re-runs extraction on an existing PASTE job in place — used when a
 * share only carried a link (see runShareTargetImport above) and the
 * user then pastes the caption by hand on the review screen. Keeps the
 * job's saved source_url instead of starting a disconnected new import.
 */
export async function retryPasteImport(jobId: string, text: string): Promise<PasteImportOutcome> {
  await extractIntoJob(jobId, text);
  return { jobId, status: "NEEDS_REVIEW" };
}
