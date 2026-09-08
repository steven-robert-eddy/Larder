import { parseIsoDurationToMinutes } from "./duration";
import { parseIngredientLine } from "./ingredient-parse";
import type { ExtractedIngredient, ExtractedStep, ExtractionResult } from "@/lib/extraction-contract";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;

const TIMER_PATTERN = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/i;

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRecipeType(node: JsonObject): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.some((t) => t === "Recipe");
  return false;
}

/** Depth-limited search for a schema.org Recipe node — handles bare objects, arrays, and @graph wrappers. */
function findRecipeNode(value: JsonValue, depth = 0): JsonObject | null {
  if (depth > 4 || value == null) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (isObject(value)) {
    if (hasRecipeType(value)) return value;
    if ("@graph" in value) return findRecipeNode(value["@graph"], depth + 1);
    return null;
  }

  return null;
}

export function extractJsonLdBlocks(html: string): JsonObject[] {
  const blocks: JsonObject[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (isObject(parsed) || Array.isArray(parsed)) {
        blocks.push(...(Array.isArray(parsed) ? (parsed as JsonObject[]) : [parsed]));
      }
    } catch {
      // Malformed JSON-LD is common in the wild — skip this block, keep looking.
    }
  }
  return blocks;
}

function textOf(value: JsonValue | undefined): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return textOf(value[0]);
  if (isObject(value) && typeof value.name === "string") return value.name;
  return null;
}

function parseServings(recipeYield: JsonValue | undefined): { yield: number | null; unit: string | null } {
  const raw = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  const str = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : null;
  if (!str) return { yield: null, unit: null };

  const match = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(str);
  if (!match) return { yield: null, unit: str || null };

  return { yield: Number(match[1]), unit: match[2].trim() || null };
}

function extractImageUrl(image: JsonValue | undefined): string | null {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return extractImageUrl(image[0]);
  if (isObject(image) && typeof image.url === "string") return image.url;
  return null;
}

function detectTimerSeconds(text: string): number | null {
  const match = TIMER_PATTERN.exec(text);
  if (!match) return null;
  const value = Number(match[2] ?? match[1]); // range like "10-15 minutes" -> use the upper bound
  const unit = match[3].toLowerCase();
  if (unit.startsWith("hour") || unit.startsWith("hr")) return Math.round(value * 3600);
  if (unit.startsWith("min")) return Math.round(value * 60);
  return Math.round(value);
}

function flattenSteps(instructions: JsonValue | undefined): ExtractedStep[] {
  if (instructions == null) return [];

  if (typeof instructions === "string") {
    return instructions
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ section: null, text, timer_seconds: detectTimerSeconds(text) }));
  }

  if (!Array.isArray(instructions)) return [];

  const steps: ExtractedStep[] = [];
  for (const entry of instructions) {
    if (typeof entry === "string") {
      steps.push({ section: null, text: entry, timer_seconds: detectTimerSeconds(entry) });
      continue;
    }
    if (!isObject(entry)) continue;

    const type = entry["@type"];
    if (type === "HowToSection") {
      const sectionName = textOf(entry.name);
      const items = Array.isArray(entry.itemListElement) ? entry.itemListElement : [];
      for (const item of items) {
        if (isObject(item) && typeof item.text === "string") {
          steps.push({ section: sectionName, text: item.text, timer_seconds: detectTimerSeconds(item.text) });
        } else if (typeof item === "string") {
          steps.push({ section: sectionName, text: item, timer_seconds: detectTimerSeconds(item) });
        }
      }
    } else if (typeof entry.text === "string") {
      steps.push({ section: null, text: entry.text, timer_seconds: detectTimerSeconds(entry.text) });
    }
  }
  return steps;
}

function flattenIngredients(recipeIngredient: JsonValue | undefined): ExtractedIngredient[] {
  if (!Array.isArray(recipeIngredient)) return [];

  return recipeIngredient
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((rawText) => {
      const parsed = parseIngredientLine(rawText);
      return {
        section: null,
        raw_text: rawText.trim(),
        quantity: parsed.quantity,
        quantity_max: parsed.quantityMax,
        unit: parsed.unit,
        item: parsed.item,
        preparation: parsed.preparation,
        is_optional: parsed.isOptional,
      };
    });
}

export type WebExtractionResult = ExtractionResult & { source_author: string | null };

/** Parses schema.org/Recipe JSON-LD out of a page's HTML, if present. */
export function parseRecipeFromHtml(html: string): WebExtractionResult | null {
  const blocks = extractJsonLdBlocks(html);
  let node: JsonObject | null = null;
  for (const block of blocks) {
    node = findRecipeNode(block);
    if (node) break;
  }
  if (!node) return null;

  const title = textOf(node.name);
  if (!title) return null;

  const servings = parseServings(node.recipeYield);
  const prepMinutes = parseIsoDurationToMinutes(typeof node.prepTime === "string" ? node.prepTime : null);
  const cookMinutes = parseIsoDurationToMinutes(typeof node.cookTime === "string" ? node.cookTime : null);
  const totalMinutes =
    parseIsoDurationToMinutes(typeof node.totalTime === "string" ? node.totalTime : null) ??
    (prepMinutes != null || cookMinutes != null ? (prepMinutes ?? 0) + (cookMinutes ?? 0) : null);

  return {
    title,
    description: textOf(node.description),
    servings_yield: servings.yield,
    servings_unit: servings.unit,
    prep_minutes: prepMinutes,
    cook_minutes: cookMinutes,
    total_minutes: totalMinutes,
    hero_image_url: extractImageUrl(node.image),
    ingredients: flattenIngredients(node.recipeIngredient),
    steps: flattenSteps(node.recipeInstructions),
    suggested_tags: [],
    source_author: textOf(node.author),
  };
}
