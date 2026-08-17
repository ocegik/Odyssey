import { describe, expect, it } from "vitest";
import {
  emptyQuickMathProgress,
  isLevelUnlocked,
  normalizeQuickMathProgress,
  recordQuickMathResult,
} from "../quickMath";

describe("quick math progression", () => {
  it("records results by level and unlocks Speed after eight Foundation answers", () => {
    let progress = emptyQuickMathProgress();
    for (let count = 0; count < 8; count += 1) {
      progress = recordQuickMathResult(progress, {
        levelId: "foundation",
        correct: true,
        elapsedMs: 1250,
        date: new Date("2026-08-17T10:00:00.000Z"),
      });
    }

    expect(progress.levels.foundation).toMatchObject({ correct: 8, total: 8, totalTimeMs: 10000 });
    expect(progress).toMatchObject({ xp: 80, currentStreak: 8, bestStreak: 8 });
    expect(progress.dailyActivity["2026-08-17"]).toEqual({ correct: 8, total: 8 });
    expect(isLevelUnlocked(progress, "speed")).toBe(true);
  });

  it("normalizes malformed stored progress without allowing fake XP", () => {
    const progress = normalizeQuickMathProgress({
      xp: 999999,
      currentStreak: -2,
      levels: { foundation: { correct: 12, total: 3, totalTimeMs: -10 } },
    });

    expect(progress.levels.foundation).toMatchObject({ correct: 3, total: 3, totalTimeMs: 0 });
    expect(progress.xp).toBe(30);
    expect(progress.currentStreak).toBe(0);
  });
});
