import { describe, expect, it } from "vitest";
import { normalizeDetailedAnalysis } from "../analysisModel";
import { buildRevisionQueue } from "../revisionQueue";

describe("revision queue", () => {
  it("derives concept-error candidates from canonical topic references", () => {
    const analysis = normalizeDetailedAnalysis({
      sections: {
        Quant: {
          blocks: [{
            type: "independent",
            questions: [{
              id: "q1",
              questionNumber: 1,
              result: "Wrong",
              outcomeReason: "Concept Error",
              topicRef: { topicId: "qa-arithmetic-percentages" },
            }],
          }],
        },
      },
    });
    const queue = buildRevisionQueue([{ id: "m1", date: "2026-01-01", source: "A", analysis }]);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ topicId: "qa-arithmetic-percentages", reason: "concept-error", dueDate: "2026-01-02" });
  });

  it("removes candidates after a completed revision event", () => {
    const analysis = normalizeDetailedAnalysis({
      sections: {
        Quant: {
          blocks: [{ type: "independent", questions: [{ id: "q1", questionNumber: 1, result: "Wrong", outcomeReason: "Concept Error", topicRef: { topicId: "qa-arithmetic" } }] }],
        },
      },
    });
    const mocks = [{ id: "m1", date: "2026-01-01", source: "A", analysis }];
    expect(buildRevisionQueue(mocks, [{ sourceQuestionId: "m1:q1", action: "completed" }])).toEqual([]);
  });
});
