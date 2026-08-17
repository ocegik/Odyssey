import { describe, expect, it } from "vitest";
import { buildAdminMetrics, startOfWeek } from "../adminMetrics";

describe("admin metrics", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");
  const profiles = [
    { id: "one", email: "one@example.com", created_at: "2026-08-17T08:00:00.000Z" },
    { id: "two", email: "two@example.com", created_at: "2026-08-05T08:00:00.000Z" },
    { id: "three", email: "three@example.com", created_at: "2026-07-31T08:00:00.000Z" },
  ];
  const mocks = [
    { user_id: "one", mock_date: "2026-08-10", created_at: "2026-08-16T12:00:00.000Z" },
    { user_id: "one", mock_date: "2026-08-15", created_at: "2026-08-01T12:00:00.000Z" },
    { user_id: "two", mock_date: "2026-08-14", created_at: "2026-08-09T11:59:59.000Z" },
  ];

  it("uses Monday as the start of the week", () => {
    const start = startOfWeek(now);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(17);
    expect(start.getHours()).toBe(0);
  });

  it("computes aggregate counts and only exposes the per-user table ceiling", () => {
    const { stats, users } = buildAdminMetrics(profiles, mocks, now);

    expect(stats).toEqual({
      totalUsers: 3,
      newThisWeek: 1,
      newThisMonth: 2,
      totalMocks: 3,
      activeUsers: 1,
      usersWithNoMocks: 1,
    });
    expect(users.find((user) => user.id === "one")).toMatchObject({
      email: "one@example.com",
      mockCount: 2,
      lastMockDate: "2026-08-15",
    });
  });
});
