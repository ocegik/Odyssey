import { describe, expect, it } from "vitest";
import { normalizeDetailedAnalysis } from "../analysisModel";
import { buildTopicMetrics } from "../topicMetrics";

describe("topic metrics", () => {
  it("rolls evidence from a leaf to its ancestors without populating siblings", () => {
    const analysis = normalizeDetailedAnalysis({
      sections: {
        Quant: {
          blocks: [{
            type: "independent",
            questions: [
              { questionNumber: 1, result: "Correct", topicRef: { topicId: "qa-arithmetic-percentages" } },
              { questionNumber: 2, result: "Wrong", questionType: "MCQ", topicRef: { topicId: "qa-arithmetic-percentages" } },
            ],
          }],
        },
      },
    });
    const metrics = buildTopicMetrics([{ id: "m1", date: "2026-01-01", source: "A", analysis }]);
    expect(metrics.byTopicId["qa-arithmetic-percentages"]).toMatchObject({ total: 2, attempted: 2, correct: 1, marks: 2 });
    expect(metrics.byTopicId["qa-arithmetic"]).toMatchObject({ total: 2, attempted: 2 });
    expect(metrics.byTopicId["qa-arithmetic-pld"]).toBeUndefined();
  });
});
