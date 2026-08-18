import { describe, expect, it } from "vitest";
import { catExamDateForYear, prepProgressPercent } from "../dateMath";

describe("CAT target date", () => {
  it("uses the last Sunday of November for a target year", () => {
    expect(catExamDateForYear(2024)).toBe("2024-11-24");
    expect(catExamDateForYear(2025)).toBe("2025-11-30");
    expect(catExamDateForYear(2026)).toBe("2026-11-29");
  });

  it("rejects invalid target years", () => {
    expect(catExamDateForYear(2019)).toBe("");
    expect(catExamDateForYear("not-a-year")).toBe("");
  });
});

describe("preparation progress", () => {
  it("measures progress from the user's start date through the CAT date", () => {
    const midpoint = new Date("2026-06-15T00:00:00").getTime();
    expect(prepProgressPercent("2026-01-01", "2026-11-29", midpoint)).toBeCloseTo(49.7, 1);
  });

  it("does not invent progress when no valid preparation window exists", () => {
    expect(prepProgressPercent("", "2026-11-29")).toBeNull();
    expect(prepProgressPercent("2026-12-01", "2026-11-29")).toBeNull();
  });
});
