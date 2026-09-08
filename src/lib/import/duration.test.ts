import { describe, expect, it } from "vitest";
import { parseIsoDurationToMinutes } from "./duration";

describe("parseIsoDurationToMinutes", () => {
  it("parses minutes only", () => {
    expect(parseIsoDurationToMinutes("PT45M")).toBe(45);
  });

  it("parses hours and minutes", () => {
    expect(parseIsoDurationToMinutes("PT1H15M")).toBe(75);
  });

  it("parses hours only", () => {
    expect(parseIsoDurationToMinutes("PT2H")).toBe(120);
  });

  it("parses days plus hours", () => {
    expect(parseIsoDurationToMinutes("P1DT2H")).toBe(24 * 60 + 120);
  });

  it("rounds fractional seconds", () => {
    expect(parseIsoDurationToMinutes("PT30S")).toBe(1);
  });

  it("returns null for null/undefined/empty", () => {
    expect(parseIsoDurationToMinutes(null)).toBeNull();
    expect(parseIsoDurationToMinutes(undefined)).toBeNull();
    expect(parseIsoDurationToMinutes("")).toBeNull();
  });

  it("returns null for garbage input rather than throwing", () => {
    expect(parseIsoDurationToMinutes("about 20 minutes")).toBeNull();
    expect(parseIsoDurationToMinutes("PT")).toBeNull();
  });
});
