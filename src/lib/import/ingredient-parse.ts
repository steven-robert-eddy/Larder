const UNITS = [
  "cups?",
  "tablespoons?",
  "tbsp",
  "teaspoons?",
  "tsp",
  "ounces?",
  "oz",
  "pounds?",
  "lbs?",
  "grams?",
  "g",
  "kilograms?",
  "kg",
  "milliliters?",
  "ml",
  "liters?",
  "l",
  "cloves?",
  "cans?",
  "pinch(?:es)?",
  "dash(?:es)?",
  "sticks?",
  "slices?",
  "bunch(?:es)?",
  "heads?",
  "packages?",
  "pkg",
  "boxes?",
  "large",
  "medium",
  "small",
];
const UNIT_PATTERN = new RegExp(`^(${UNITS.join("|")})\\.?$`, "i");

const FRACTION_MAP: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

function parseNumberToken(token: string): number | null {
  token = token.trim();
  if (token in FRACTION_MAP) return FRACTION_MAP[token];

  // mixed number, e.g. "1 1/2"
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(token);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  // simple fraction, e.g. "1/2"
  const fraction = /^(\d+)\/(\d+)$/.exec(token);
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2]);
  }

  const decimal = /^\d+(\.\d+)?$/.exec(token);
  if (decimal) return Number(token);

  return null;
}

export type ParsedIngredient = {
  quantity: number | null;
  quantityMax: number | null;
  unit: string | null;
  item: string | null;
  preparation: string | null;
  isOptional: boolean;
};

/**
 * Best-effort parse of a single ingredient line into structured fields.
 * `raw_text` is what's actually shown in the UI and is never replaced by
 * this — these fields exist for future scaling/grocery-list use, so
 * getting them approximately right is enough; a failed parse just leaves
 * everything but raw_text null.
 */
export function parseIngredientLine(rawText: string): ParsedIngredient {
  const empty: ParsedIngredient = {
    quantity: null,
    quantityMax: null,
    unit: null,
    item: null,
    preparation: null,
    isOptional: false,
  };

  let text = rawText.trim();
  if (!text) return empty;

  const isOptional = /\boptional\b/i.test(text);
  // Strip a bare "(optional)" / ", optional" so it doesn't end up duplicated
  // in the parsed item/preparation — raw_text keeps it regardless.
  text = text.replace(/[,;]?\s*\(?optional\)?\.?/i, "").trim();

  // Leading quantity: "2", "1/2", "1 1/2", "½", optionally followed by a
  // range ("2-3", "2 to 3").
  const qtyMatch =
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*(?:-|–|to)\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?\s*/.exec(
      text,
    );

  let quantity: number | null = null;
  let quantityMax: number | null = null;
  let rest = text;

  if (qtyMatch) {
    quantity = parseNumberToken(qtyMatch[1]);
    if (qtyMatch[2]) quantityMax = parseNumberToken(qtyMatch[2]);
    rest = text.slice(qtyMatch[0].length);
  }

  // Optional unit right after the quantity.
  let unit: string | null = null;
  const restWords = rest.split(/\s+/);
  if (restWords.length > 0 && UNIT_PATTERN.test(restWords[0])) {
    unit = restWords[0].replace(/\.$/, "").toLowerCase();
    rest = restWords.slice(1).join(" ");
  }

  // Split "item, preparation" on the first comma.
  const commaIndex = rest.indexOf(",");
  let item: string | null = null;
  let preparation: string | null = null;
  if (commaIndex >= 0) {
    item = rest.slice(0, commaIndex).trim() || null;
    preparation = rest.slice(commaIndex + 1).trim() || null;
  } else {
    item = rest.trim() || null;
  }

  return {
    quantity,
    quantityMax,
    unit,
    item,
    preparation,
    isOptional,
  };
}
