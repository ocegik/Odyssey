import { describe, expect, it } from "vitest";
import { normalizeLearningState } from "../useSyllabus";

describe("learning state migration contract", () => {
  it("keeps legacy syllabus metrics recoverable under legacyMetrics", async () => {
    const normalized = normalizeLearningState({
      progress: {
        "qa-arithmetic-percentages": {
          completed: true,
          mockAccuracy: 0.42,
          attempts: 7,
          priorityScore: 0.9,
          masteryLevel: "weak",
          revisionHistory: [{ occurredAt: "2026-01-01", action: "reviewed" }],
        },
      },
    });
    const progress = normalized.progress["qa-arithmetic-percentages"];
    expect(normalized.learningStateVersion).toBe(1);
    expect(progress).toMatchObject({ completed: true, completionStatus: "completed" });
    expect(progress.legacyMetrics).toMatchObject({ mockAccuracy: 0.42, attempts: 7, priorityScore: 0.9, masteryLevel: "weak", revisionHistory: [{ action: "reviewed" }] });
    expect(progress).not.toHaveProperty("revisionHistory");
  });
});
