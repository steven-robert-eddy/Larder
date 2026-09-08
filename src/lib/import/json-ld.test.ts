import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRecipeFromHtml } from "./json-ld";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

describe("parseRecipeFromHtml", () => {
  it("parses a flat WPRM-style recipe with array image and full durations", () => {
    const result = parseRecipeFromHtml(fixture("wprm-style.html"));
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Weeknight Sheet Pan Chicken Fajitas");
    expect(result!.description).toContain("one pan");
    expect(result!.servings_yield).toBe(4);
    expect(result!.servings_unit).toBe("servings");
    expect(result!.prep_minutes).toBe(15);
    expect(result!.cook_minutes).toBe(20);
    expect(result!.total_minutes).toBe(35);
    expect(result!.hero_image_url).toBe("https://example-kitchen.test/images/fajitas-1x1.jpg");
    expect(result!.source_author).toBe("Jamie Cook");
    expect(result!.ingredients).toHaveLength(7);
    expect(result!.ingredients[0]).toMatchObject({
      raw_text: "1.5 lbs boneless chicken breast, sliced into strips",
      quantity: 1.5,
      unit: "lbs",
    });
    // "lime wedges, for serving, optional" — optional flag detected
    expect(result!.ingredients.at(-1)).toMatchObject({ is_optional: true });
    expect(result!.steps).toHaveLength(4);
    expect(result!.steps[0].text).toContain("Preheat oven");
    // "18-20 minutes" in step text should populate a timer
    expect(result!.steps[2].timer_seconds).toBe(20 * 60);
  });

  it("parses HowToStep objects, an ImageObject, a plain-string author, and numeric yield", () => {
    const result = parseRecipeFromHtml(fixture("howto-steps.html"));
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Classic Beef Stew");
    expect(result!.servings_yield).toBe(6);
    expect(result!.hero_image_url).toBe("https://hearthhome.test/img/beef-stew.jpg");
    expect(result!.source_author).toBe("Hearth & Home Test Kitchen");
    // no totalTime given, so it's derived from prep + cook
    expect(result!.prep_minutes).toBe(20);
    expect(result!.cook_minutes).toBe(150);
    expect(result!.total_minutes).toBe(170);
    expect(result!.steps).toHaveLength(4);
    expect(result!.steps.every((s) => s.section == null)).toBe(true);
    // ingredient range: "3-4 potatoes, cubed"
    const potatoes = result!.ingredients.find((i) => i.item === "potatoes");
    expect(potatoes).toMatchObject({ quantity: 3, quantity_max: 4, preparation: "cubed" });
  });

  it("finds a Recipe nested in an @graph array and preserves HowToSection names", () => {
    const result = parseRecipeFromHtml(fixture("graph-sections.html"));
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Layered Lasagna");
    // "Makes one 9x13 pan" has no leading number — falls back to yield=null, unit=whole string
    expect(result!.servings_yield).toBeNull();
    expect(result!.servings_unit).toBe("Makes one 9x13 pan");
    expect(result!.steps.map((s) => s.section)).toEqual(["Prep", "Assemble", "Assemble", "Bake", "Bake"]);
  });

  it("splits a single instructions string on newlines when there's no ingredient/step structure", () => {
    const result = parseRecipeFromHtml(fixture("sparse.html"));
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Iced Coffee");
    expect(result!.description).toBeNull();
    expect(result!.prep_minutes).toBeNull();
    expect(result!.steps).toHaveLength(3);
    expect(result!.steps.map((s) => s.text)).toEqual([
      "Fill a glass with ice.",
      "Pour coffee over the ice.",
      "Add milk to taste.",
    ]);
  });

  it("returns null (never throws) when a page has no schema.org/Recipe JSON-LD at all", () => {
    expect(parseRecipeFromHtml(fixture("no-structured-data.html"))).toBeNull();
  });

  it("returns null for empty or garbage HTML rather than throwing", () => {
    expect(parseRecipeFromHtml("")).toBeNull();
    expect(parseRecipeFromHtml("<html><body>not a recipe</body></html>")).toBeNull();
    expect(parseRecipeFromHtml("<script type=\"application/ld+json\">{not valid json</script>")).toBeNull();
  });
});
