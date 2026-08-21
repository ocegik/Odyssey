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

  it("counts a set topic and semantic question type as syllabus evidence", () => {
    const analysis = normalizeDetailedAnalysis({
      sections: {
        VARC: {
          blocks: [{
            type: "set",
            questions: [{
              questionNumber: 1,
              result: "Correct",
              topicRef: { topicId: "varc-rc-history" },
              questionTypeRef: { topicId: "varc-rc-inference" },
            }],
          }],
        },
      },
    });
    const metrics = buildTopicMetrics([{ id: "m1", date: "2026-01-01", source: "A", analysis }]);
    expect(metrics.byTopicId["varc-rc-history"]).toMatchObject({ directTotal: 1, correct: 1 });
    expect(metrics.byTopicId["varc-rc-inference"]).toMatchObject({ directTotal: 1, correct: 1 });
    expect(metrics.byTopicId["varc-rc"]).toMatchObject({ total: 1, correct: 1 });
  });
});
