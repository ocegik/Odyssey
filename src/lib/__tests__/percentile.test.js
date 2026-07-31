import { describe, expect, it } from "vitest";
import { buildPercentileSeries, mockOverallPercentile, percentileCaveat } from "../percentile";

describe("mockOverallPercentile", () => {
  it("uses a reported overall percentile as-is, unflagged", () => {
    const result = mockOverallPercentile({ analysis: { overallPercentile: 96.2 } });
    expect(result).toMatchObject({ value: 96.2, estimated: false });
    expect(percentileCaveat(result)).toBeNull();
  });

  it("flags the sectional average as an estimate — percentiles are ranks, not quantities", () => {
    const result = mockOverallPercentile({
      VARC: { percentile: 90 },
      DILR: { percentile: 80 },
      Quant: { percentile: 70 },
    });
    expect(result.value).toBe(80);
    expect(result.estimated).toBe(true);
    expect(result.sectionsUsed).toBe(3);
    expect(percentileCaveat(result)).toMatch(/Estimated/);
  });

  it("says how thin a partial estimate is, rather than passing one section off as overall", () => {
    const result = mockOverallPercentile({ VARC: { percentile: 90 } });
    expect(result.value).toBe(90);
    expect(result.sectionsUsed).toBe(1);
    expect(percentileCaveat(result)).toContain("1 of 3");
  });

  it("returns null when there's nothing to go on", () => {
    expect(mockOverallPercentile({})).toBeNull();
    expect(mockOverallPercentile(null)).toBeNull();
  });
});

describe("buildPercentileSeries", () => {
  it("drops mocks with no percentile anywhere instead of plotting empty columns", () => {
    const series = buildPercentileSeries([
      { label: "A", VARC: { percentile: 88 } },
      { label: "B" },
      { label: "C", analysis: { overallPercentile: 95 }, Quant: { percentile: 70 } },
    ]);

    expect(series.map((row) => row.label)).toEqual(["A", "C"]);
    expect(series[0]).toMatchObject({ Overall: 88, VARC: 88, DILR: null, Quant: null, overallEstimated: true });
    expect(series[1]).toMatchObject({ Overall: 95, Quant: 70, overallEstimated: false });
  });
});
