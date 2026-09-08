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

export class AiExtractionError extends Error {}

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
