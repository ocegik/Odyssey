function dateValue(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function buildAdminMetrics(profiles, mocks, now = new Date()) {
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const activeSince = new Date(now);
  activeSince.setDate(activeSince.getDate() - 7);

  const mocksByUser = new Map();
  (mocks || []).forEach((mock) => {
    const userMocks = mocksByUser.get(mock.user_id) || [];
    userMocks.push(mock);
    mocksByUser.set(mock.user_id, userMocks);
  });

  const users = (profiles || []).map((profile) => {
    const userMocks = mocksByUser.get(profile.id) || [];
    const lastMock = userMocks.reduce((latest, mock) => {
      if (!latest || String(mock.mock_date) > String(latest.mock_date)) return mock;
      return latest;
    }, null);
    return {
      id: profile.id,
      email: profile.email || "—",
      signupDate: profile.created_at,
      mockCount: userMocks.length,
      lastMockDate: lastMock?.mock_date ?? null,
    };
  });

  const signedUpSince = (start) =>
    users.filter((user) => {
      const date = dateValue(user.signupDate);
      return date && date >= start && date <= now;
    }).length;

  const activeUserIds = new Set(
    (mocks || [])
      .filter((mock) => {
        const createdAt = dateValue(mock.created_at);
        return createdAt && createdAt >= activeSince && createdAt <= now;
      })
      .map((mock) => mock.user_id),
  );

  return {
    users,
    stats: {
      totalUsers: users.length,
      newThisWeek: signedUpSince(weekStart),
      newThisMonth: signedUpSince(monthStart),
      totalMocks: (mocks || []).length,
      activeUsers: activeUserIds.size,
      usersWithNoMocks: users.filter((user) => user.mockCount === 0).length,
    },
  };
}
