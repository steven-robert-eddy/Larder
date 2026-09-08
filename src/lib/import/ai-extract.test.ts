import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env before importing the module under test — extractRecipeWithAI
// checks env.anthropicApiKey before ever touching the SDK.
vi.mock("@/lib/env", () => ({
  env: { anthropicApiKey: "test-key" },
}));

const parseMock = vi.fn();
class FakeAnthropic {
  messages = { parse: parseMock };
}
vi.mock("@anthropic-ai/sdk", () => ({
  default: FakeAnthropic,
}));

const { extractRecipeWithAI, AiExtractionError } = await import("./ai-extract");

describe("extractRecipeWithAI", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("returns the parsed_output from a successful call — no live API call made", async () => {
    const extracted = {
      title: "Weeknight Chili",
      description: null,
      servings_yield: 4,
      servings_unit: "servings",
      prep_minutes: 10,
      cook_minutes: 30,
      total_minutes: 40,
      hero_image_url: null,
      ingredients: [{ raw_text: "1 lb ground beef", is_optional: false }],
      steps: [{ text: "Brown the beef." }],
      suggested_tags: [],
    };
    parseMock.mockResolvedValue({ parsed_output: extracted });

    const result = await extractRecipeWithAI("some caption text");

    expect(result).toEqual(extracted);
    expect(parseMock).toHaveBeenCalledTimes(1);
    const call = parseMock.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-5");
    expect(call.messages).toEqual([{ role: "user", content: "some caption text" }]);
    expect(call.output_config.format).toBeDefined();
  });

  it("throws AiExtractionError when the model returns no parsed_output", async () => {
    parseMock.mockResolvedValue({ parsed_output: null });

    await expect(extractRecipeWithAI("garbage")).rejects.toThrow(AiExtractionError);
  });

  it("wraps a thrown SDK error in AiExtractionError", async () => {
    parseMock.mockRejectedValue(new Error("rate limited"));

    await expect(extractRecipeWithAI("text")).rejects.toThrow(AiExtractionError);
  });
});

describe("extractRecipeWithAI without a configured key", () => {
  it("throws before touching the SDK", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({ env: { anthropicApiKey: "" } }));
    const { extractRecipeWithAI: extractWithoutKey, AiExtractionError: ErrClass } = await import("./ai-extract");

    await expect(extractWithoutKey("text")).rejects.toThrow(ErrClass);
    expect(parseMock).not.toHaveBeenCalled();
  });
});
