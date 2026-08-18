import { describe, expect, it } from "vitest";
import { buildPersonalCommunityStats, normalizeCommunityDashboard } from "../communityStats";

describe("community stats", () => {
  it("builds personal metrics from local mocks", () => {
    const now = new Date("2026-08-18T12:00:00Z").getTime();
    const stats = buildPersonalCommunityStats([
      { createdAt: now - 2 * 24 * 60 * 60 * 1000, manualTotalMarks: 74, overallPercentile: 94.2, sections: {} },
      { createdAt: now - 45 * 24 * 60 * 60 * 1000, manualTotalMarks: 82, overallPercentile: 91.6, sections: {} },
      { createdAt: now - 5 * 24 * 60 * 60 * 1000, sections: {} },
    ], now);

    expect(stats).toMatchObject({
      totalMocks: 3,
      mocksLast30Days: 2,
      scoredMockCount: 2,
      bestScore: 82,
      latestPercentile: 91.6,
    });
  });

  it("normalizes RPC payloads without turning missing values into NaN", () => {
    expect(normalizeCommunityDashboard({
      total_students: "12",
      leaderboard: [{ rank: "1", display_name: "Aditi Sharma", mock_count: "4", latest_score: "76.5" }],
    })).toEqual({
      totalStudents: 12,
      totalMocks: 0,
      mocksLast30Days: 0,
      activeLearners: 0,
      leaderboard: [{ rank: 1, displayName: "Aditi Sharma", mockCount: 4, latestScore: 76.5 }],
    });
  });
});
