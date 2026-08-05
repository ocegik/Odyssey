import { describe, expect, it } from "vitest";
import { buildPercentileSeries, mockOverallPercentile } from "../percentile";

describe("mockOverallPercentile", () => {
  it("uses the reported mock-level overall percentile as-is", () => {
    const result = mockOverallPercentile({ overallPercentile: 96.2 });
    expect(result).toMatchObject({ value: 96.2 });
  });

  it("does not infer an overall percentile from sectional percentiles", () => {
    expect(mockOverallPercentile({
      VARC: { percentile: 90 },
      DILR: { percentile: 80 },
      Quant: { percentile: 70 },
    })).toBeNull();
  });

  it("returns null when there's nothing to go on", () => {
    expect(mockOverallPercentile({})).toBeNull();
    expect(mockOverallPercentile(null)).toBeNull();
  });
});

describe("buildPercentileSeries", () => {
  it("uses only reported overall percentile values for the overall series", () => {
    const series = buildPercentileSeries([
      { label: "A", VARC: { percentile: 88 } },
      { label: "B" },
      { label: "C", overallPercentile: 95, Quant: { percentile: 70 } },
    ]);

    expect(series.map((row) => row.label)).toEqual(["A", "C"]);
    expect(series[0]).toMatchObject({ Overall: null, VARC: 88, DILR: null, Quant: null });
    expect(series[1]).toMatchObject({ Overall: 95, Quant: 70 });
  });
});
