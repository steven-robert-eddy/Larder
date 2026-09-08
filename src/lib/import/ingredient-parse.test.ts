import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "./ingredient-parse";

describe("parseIngredientLine", () => {
  it("parses a simple quantity + unit + item", () => {
    expect(parseIngredientLine("2 cups flour")).toEqual({
      quantity: 2,
      quantityMax: null,
      unit: "cups",
      item: "flour",
      preparation: null,
      isOptional: false,
    });
  });

  it("parses item + preparation split on comma", () => {
    expect(parseIngredientLine("2 cloves garlic, minced")).toMatchObject({
      quantity: 2,
      unit: "cloves",
      item: "garlic",
      preparation: "minced",
    });
  });

  it("parses a simple fraction", () => {
    expect(parseIngredientLine("1/2 cup sugar")).toMatchObject({
      quantity: 0.5,
      unit: "cup",
      item: "sugar",
    });
  });

  it("parses a mixed number", () => {
    expect(parseIngredientLine("1 1/2 cups milk")).toMatchObject({
      quantity: 1.5,
      unit: "cups",
      item: "milk",
    });
  });

  it("parses a unicode fraction", () => {
    expect(parseIngredientLine("½ tsp salt")).toMatchObject({
      quantity: 0.5,
      unit: "tsp",
      item: "salt",
    });
  });

  it("parses a quantity range", () => {
    expect(parseIngredientLine("2-3 cloves garlic, minced")).toMatchObject({
      quantity: 2,
      quantityMax: 3,
      unit: "cloves",
      item: "garlic",
      preparation: "minced",
    });
  });

  it("parses a decimal quantity", () => {
    expect(parseIngredientLine("1.5 lbs chicken breast")).toMatchObject({
      quantity: 1.5,
      unit: "lbs",
      item: "chicken breast",
    });
  });

  it("detects optional and strips it from the parsed text but keeps other fields", () => {
    const result = parseIngredientLine("lime wedges, for serving, optional");
    expect(result.isOptional).toBe(true);
    expect(result.item).toBe("lime wedges");
  });

  it("handles a line with no quantity at all", () => {
    expect(parseIngredientLine("salt and pepper, to taste")).toMatchObject({
      quantity: null,
      unit: null,
      item: "salt and pepper",
      preparation: "to taste",
    });
  });

  it("never throws on empty input", () => {
    expect(parseIngredientLine("")).toEqual({
      quantity: null,
      quantityMax: null,
      unit: null,
      item: null,
      preparation: null,
      isOptional: false,
    });
  });

  it("treats a descriptive size word as a unit", () => {
    expect(parseIngredientLine("2 large eggs")).toMatchObject({
      quantity: 2,
      unit: "large",
      item: "eggs",
    });
  });
});
