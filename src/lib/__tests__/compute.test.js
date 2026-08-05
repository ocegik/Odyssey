import { describe, expect, it } from "vitest";
import { avgOfLastN, bestMarks, computeAdaptiveTarget, mockTotalMarks, overallPercentileVsMarksInsight } from "../compute";

const mock = (sections, manualTotalMarks = null) => ({ manualTotalMarks, ...sections });
const scored = (marks) => ({ totalMarks: marks });

describe("mockTotalMarks", () => {
  it("sums whichever sections have a score", () => {
    expect(mockTotalMarks(mock({ VARC: scored(20), DILR: scored(15), Quant: scored(9) }))).toBe(44);
  });

  it("prefers an explicit mock-level score over the section sum", () => {
    expect(mockTotalMarks(mock({ VARC: scored(20) }, 99))).toBe(99);
  });

  it("returns null — not 0 — for a mock logged without any score", () => {
    // A 0 here is indistinguishable from a genuine zero, and would drag down
    // best/average/target as if the mock had been sat and bombed.
    expect(mockTotalMarks(mock({}))).toBeNull();
    expect(mockTotalMarks(mock({ VARC: { totalMarks: null } }))).toBeNull();
    expect(mockTotalMarks(undefined)).toBeNull();
  });

  it("still reports a real zero as 0", () => {
    expect(mockTotalMarks(mock({ VARC: scored(0) }))).toBe(0);
  });
});

describe("bestMarks / avgOfLastN", () => {
  const mocks = [
    mock({ VARC: scored(30) }),
    mock({}), // logged, not yet scored
    mock({ VARC: scored(50) }),
    mock({ VARC: scored(40) }),
  ];

  it("ignores unscored mocks rather than treating them as zeros", () => {
    expect(bestMarks(mocks)).toBe(50);
    expect(avgOfLastN(mocks, 3)).toBe(40); // (30 + 50 + 40) / 3
  });

  it("averages the last N scored mocks, not the last N rows", () => {
    expect(avgOfLastN(mocks, 2)).toBe(45); // (50 + 40) / 2
  });

  it("returns null with nothing to average", () => {
    expect(bestMarks([])).toBeNull();
    expect(avgOfLastN([mock({})], 3)).toBeNull();
  });
});

describe("computeAdaptiveTarget", () => {
  it("steps up from the last score, capped at the long-term goal", () => {
    expect(computeAdaptiveTarget(50, 100)).toBe(55);
    expect(computeAdaptiveTarget(98, 100)).toBe(100);
  });

  it("keeps raising the bar once the goal is already met", () => {
    expect(computeAdaptiveTarget(100, 100)).toBe(105);
  });

  it("falls back to the goal when there's no score to step from", () => {
    expect(computeAdaptiveTarget(null, 100)).toBe(100);
    expect(computeAdaptiveTarget(null, null)).toBeNull();
  });
});

describe("overallPercentileVsMarksInsight", () => {
  it("uses reported overall percentile with marks to identify a harder paper", () => {
    const insight = overallPercentileVsMarksInsight([
      { manualTotalMarks: 100, overallPercentile: 85 },
      { manualTotalMarks: 90, overallPercentile: 91 },
    ]);

    expect(insight).toMatchObject({
      id: "overall-percentile-vs-marks",
      tone: "positive",
    });
    expect(insight.text).toContain("harder for the cohort");
  });

  it("does not infer an overall signal without reported overall percentiles", () => {
    expect(overallPercentileVsMarksInsight([
      { manualTotalMarks: 100, VARC: { percentile: 85 } },
      { manualTotalMarks: 90, VARC: { percentile: 91 } },
    ])).toBeNull();
  });
});
