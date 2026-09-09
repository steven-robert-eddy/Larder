import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { extractionContractSchema, type ExtractionResult } from "@/lib/extraction-contract";

// Sonnet, not Opus — this is a straightforward extraction task (text in,
// structured JSON out), not multi-step reasoning, and it runs on every
// import that lacks structured data. See design doc section 12: AI calls
// go behind this interface so callers never touch the SDK directly —
// swappable model, and mockable in tests (no live API calls in the suite).
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You extract recipes from raw, messy text — scraped web pages, social media captions, or notes pasted by hand — into a structured format.

Rules:
- Preserve ingredient lines close to verbatim in raw_text; do not invent quantities, units, or ingredients that aren't stated.
- If a field isn't present in the source text, leave it null rather than guessing.
- Split ingredients and steps in the order they appear. Keep section headers (e.g. "For the sauce") in the section field when present.
- If the text isn't a recipe at all, still return your best-effort structure with an empty ingredients/steps array rather than refusing.`;

const VISION_SYSTEM_PROMPT = `You extract recipes from screenshots — usually a social media caption (e.g. Instagram) that didn't fit on one screen, so you may receive several images in sequence. Read them in the order given and treat them as one continuous caption, not separate recipes.

Rules:
- Preserve ingredient lines close to verbatim in raw_text; do not invent quantities, units, or ingredients that aren't stated.
- Ignore UI chrome in the screenshots — likes/comments counts, usernames, timestamps, buttons, other posts. Only extract the actual caption/recipe text.
- If a field isn't visible in the images, leave it null rather than guessing.
- Split ingredients and steps in the order they appear. Keep section headers (e.g. "For the sauce") in the section field when present.
- If the images don't show a recipe at all, still return your best-effort structure with an empty ingredients/steps array rather than refusing.`;

export class AiExtractionError extends Error {}

export type ScreenshotImage = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

/**
 * Sends raw text to Claude and parses the response against the shared
 * extraction contract. Callers are responsible for deciding when to use
 * this (e.g. after a structured-data parse fails) and for never letting a
 * failure here lose the user's data — see design doc section 12.
 */
export async function extractRecipeWithAI(text: string): Promise<ExtractionResult> {
  if (!env.anthropicApiKey) {
    throw new AiExtractionError("AI extraction is not configured (missing ANTHROPIC_API_KEY).");
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  let response;
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(extractionContractSchema) },
    });
  } catch (err) {
    throw new AiExtractionError(err instanceof Error ? err.message : "AI extraction request failed.");
  }

  if (!response.parsed_output) {
    throw new AiExtractionError("The model did not return a valid recipe structure.");
  }

  return response.parsed_output;
}

/**
 * Same contract as extractRecipeWithAI, but from screenshots instead of
 * text — the caption-doesn't-fit-on-one-screen case. Claude reads text
 * out of images natively; this isn't a separate OCR step bolted on.
 */
export async function extractRecipeFromImages(images: ScreenshotImage[]): Promise<ExtractionResult> {
  if (!env.anthropicApiKey) {
    throw new AiExtractionError("AI extraction is not configured (missing ANTHROPIC_API_KEY).");
  }
  if (images.length === 0) {
    throw new AiExtractionError("No images provided.");
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  let response;
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: image.mediaType, data: image.base64 },
            })),
            { type: "text" as const, text: "Extract the recipe from these screenshots." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(extractionContractSchema) },
    });
  } catch (err) {
    throw new AiExtractionError(err instanceof Error ? err.message : "AI extraction request failed.");
  }

  if (!response.parsed_output) {
    throw new AiExtractionError("The model did not return a valid recipe structure.");
  }

  return response.parsed_output;
}
