import { bestMarks, mockTotalMarks } from "./compute";
import { latestKnownPercentile } from "./percentile";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function timestamp(value) {
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Personal Community metrics intentionally use the in-memory mock dataset so
 * they update immediately when a mock is logged, rather than waiting for the
 * next cloud refresh. The shared figures and leaderboard are loaded by the
 * Supabase RPC in CommunityTab.
 */
export function buildPersonalCommunityStats(mocks, now = Date.now()) {
  const list = Array.isArray(mocks) ? mocks : [];
  const since = now - THIRTY_DAYS_MS;
  const recentCount = list.filter((mock) => {
    const createdAt = timestamp(mock?.createdAt);
    return createdAt !== null && createdAt >= since && createdAt <= now;
  }).length;
  const scoredMocks = list.filter((mock) => Number.isFinite(mockTotalMarks(mock)));

  return {
    totalMocks: list.length,
    mocksLast30Days: recentCount,
    scoredMockCount: scoredMocks.length,
    bestScore: bestMarks(list),
    latestPercentile: latestKnownPercentile(list)?.value ?? null,
  };
}

export function normalizeCommunityDashboard(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    totalStudents: number(source.total_students),
    totalMocks: number(source.total_mocks),
    mocksLast30Days: number(source.mocks_last_30_days),
    activeLearners: number(source.active_learners),
    leaderboard: Array.isArray(source.leaderboard)
      ? source.leaderboard.map((entry, index) => ({
        rank: number(entry?.rank) || index + 1,
        displayName: typeof entry?.display_name === "string" && entry.display_name ? entry.display_name : "Odyssey learner",
        mockCount: number(entry?.mock_count),
        latestScore: Number.isFinite(Number(entry?.latest_score)) ? Number(entry.latest_score) : null,
      }))
      : [],
  };
}
