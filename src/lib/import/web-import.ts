import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { fetchPageHtml, extractSiteName, PageFetchError } from "./fetch-page";
import { parseRecipeFromHtml } from "./json-ld";
import { downloadAndStoreHeroImage } from "./hero-image";

// Cap how much raw HTML we keep for a failed-to-parse job — enough to
// diagnose or hand-fix from, not the whole multi-megabyte page.
const RAW_PAYLOAD_CHAR_CAP = 500_000;

export type WebImportOutcome = { jobId: string; status: "NEEDS_REVIEW" | "FAILED" };

/**
 * Parses HTML already in hand into an ImportJob's parsed/raw payload.
 * Shared by the two ways HTML gets obtained: fetched server-side
 * (runWebImport) or captured client-side by the bookmarklet
 * (runClippedImport) — see clip-token.ts for why the latter exists.
 */
async function processHtmlIntoImportJob(userId: string, jobId: string, url: string, html: string): Promise<void> {
  const parsed = parseRecipeFromHtml(html);
  const siteName = extractSiteName(html, url);

  if (!parsed) {
    // Never let extraction failure lose data (design doc section 12) — the
    // raw HTML is kept so this can still be reviewed and filled in by hand.
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "NEEDS_REVIEW",
        rawPayload: { html: html.slice(0, RAW_PAYLOAD_CHAR_CAP) } satisfies Prisma.InputJsonValue,
      },
    });
    return;
  }

  const heroImageUrl = parsed.hero_image_url
    ? await downloadAndStoreHeroImage(userId, jobId, parsed.hero_image_url)
    : null;

  const payload = {
    ...parsed,
    source_url: url,
    source_name: siteName,
    stored_hero_image_url: heroImageUrl,
  };

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "NEEDS_REVIEW", parsedPayload: payload satisfies Prisma.InputJsonValue },
  });
}

/**
 * Runs synchronously (no job queue yet — see design doc section 12,
 * "don't scaffold a later phase's features"; that's for the AI
 * fallback and photo/OCR paths, which are genuinely slow). The
 * structured-data path is fast enough to just await inline.
 */
export async function runWebImport(userId: string, url: string): Promise<WebImportOutcome> {
  const job = await prisma.importJob.create({
    data: { userId, kind: "WEB", status: "RUNNING", inputUrl: url },
  });

  let html: string;
  try {
    html = await fetchPageHtml(url);
  } catch (err) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof PageFetchError ? err.message : "Could not fetch that page.",
      },
    });
    return { jobId: job.id, status: "FAILED" };
  }

  await processHtmlIntoImportJob(userId, job.id, url, html);
  return { jobId: job.id, status: "NEEDS_REVIEW" };
}

/**
 * Same pipeline, but the HTML was already captured by the bookmarklet
 * running in the user's own browser on the actual page — no server-side
 * fetch involved, so sites that block scraper-shaped requests (see
 * design doc section 5.1 in spirit — "don't build as if the fetch is
 * the main path") still work, since nothing here looks like a bot.
 */
export async function runClippedImport(userId: string, url: string, html: string): Promise<WebImportOutcome> {
  const job = await prisma.importJob.create({
    data: { userId, kind: "WEB", status: "RUNNING", inputUrl: url },
  });

  await processHtmlIntoImportJob(userId, job.id, url, html);
  return { jobId: job.id, status: "NEEDS_REVIEW" };
}
