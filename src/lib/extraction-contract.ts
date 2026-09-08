import { z } from "zod";

/**
 * Shared extraction contract (design doc section 5.5). Every import path —
 * web, and later Instagram/cookbook-photo/AI — produces this same shape
 * before the review screen. One schema, one review screen, one set of
 * tests; a new import source means writing one adapter, not a new
 * pipeline.
 */
export const extractedIngredientSchema = z.object({
  section: z.string().nullable().optional(),
  raw_text: z.string(),
  quantity: z.number().nullable().optional(),
  quantity_max: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  item: z.string().nullable().optional(),
  preparation: z.string().nullable().optional(),
  is_optional: z.boolean().default(false),
});

export const extractedStepSchema = z.object({
  section: z.string().nullable().optional(),
  text: z.string(),
  timer_seconds: z.number().nullable().optional(),
});

export const suggestedTagSchema = z.object({
  facet: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
});

export const extractionContractSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  servings_yield: z.number().nullable().optional(),
  servings_unit: z.string().nullable().optional(),
  prep_minutes: z.number().nullable().optional(),
  cook_minutes: z.number().nullable().optional(),
  total_minutes: z.number().nullable().optional(),
  hero_image_url: z.string().nullable().optional(),
  ingredients: z.array(extractedIngredientSchema),
  steps: z.array(extractedStepSchema),
  suggested_tags: z.array(suggestedTagSchema).default([]),
});

export type ExtractedIngredient = z.infer<typeof extractedIngredientSchema>;
export type ExtractedStep = z.infer<typeof extractedStepSchema>;
export type SuggestedTag = z.infer<typeof suggestedTagSchema>;
export type ExtractionResult = z.infer<typeof extractionContractSchema>;
