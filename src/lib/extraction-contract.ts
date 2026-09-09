import { z } from "zod";

/**
 * Shared extraction contract (design doc section 5.5). Every import path —
 * web, and later Instagram/cookbook-photo/AI — produces this same shape
 * before the review screen. One schema, one review screen, one set of
 * tests; a new import source means writing one adapter, not a new
 * pipeline.
 */
// Every field is required-but-nullable, never optional. Structured
// outputs (output_config.format) scores schema complexity partly on the
// number of anyOf/optional branches — mixing .optional() with .nullable()
// on ~15 fields across nested arrays was enough to trip Anthropic's
// "Schema is too complex" 400. Required+nullable halves the branch count
// per field (null | T instead of undefined | null | T) and is the
// standard shape for structured-output schemas anyway: the model always
// includes the key, using null for "not present" instead of omitting it.
export const extractedIngredientSchema = z.object({
  section: z.string().nullable(),
  raw_text: z.string(),
  quantity: z.number().nullable(),
  quantity_max: z.number().nullable(),
  unit: z.string().nullable(),
  item: z.string().nullable(),
  preparation: z.string().nullable(),
  is_optional: z.boolean(),
});

export const extractedStepSchema = z.object({
  section: z.string().nullable(),
  text: z.string(),
  timer_seconds: z.number().nullable(),
});

export const suggestedTagSchema = z.object({
  facet: z.string(),
  name: z.string(),
  confidence: z.number(),
});

export const extractionContractSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  servings_yield: z.number().nullable(),
  servings_unit: z.string().nullable(),
  prep_minutes: z.number().nullable(),
  cook_minutes: z.number().nullable(),
  total_minutes: z.number().nullable(),
  hero_image_url: z.string().nullable(),
  ingredients: z.array(extractedIngredientSchema),
  steps: z.array(extractedStepSchema),
  suggested_tags: z.array(suggestedTagSchema),
});

export type ExtractedIngredient = z.infer<typeof extractedIngredientSchema>;
export type ExtractedStep = z.infer<typeof extractedStepSchema>;
export type SuggestedTag = z.infer<typeof suggestedTagSchema>;
export type ExtractionResult = z.infer<typeof extractionContractSchema>;
