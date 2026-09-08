// Cap how much stripped text we send to the model — enough for even a
// long recipe post, but bounded so a pathological page doesn't blow up
// token cost (see design doc section 12 on AI calls going behind a
// boundary we control).
const MAX_TEXT_CHARS = 15_000;

const NOISE_TAGS = /<(script|style|nav|header|footer|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi;

/**
 * Readability-style extraction (design doc section 5.1): strip a page
 * down to plain text worth sending to the AI fallback. Not a full
 * Readability port — just enough to drop nav/boilerplate noise so the
 * model's context is mostly recipe content, matching the lightweight
 * regex approach already used for JSON-LD extraction in this directory.
 */
export function extractReadableText(html: string): string {
  const withoutNoise = html.replace(NOISE_TAGS, " ");
  const withoutTags = withoutNoise.replace(/<[^>]+>/g, " ");
  const decoded = decodeEntities(withoutTags);
  const collapsed = decoded.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return collapsed.slice(0, MAX_TEXT_CHARS);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Best-effort Open Graph image for pages with no JSON-LD recipe image. */
export function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  return match ? match[1] : null;
}
