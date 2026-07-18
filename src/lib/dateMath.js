export const MS_PER_DAY = 86400000;

export function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function parseDate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntil(iso) {
  const date = parseDate(iso);
  if (!date) return null;
  return Math.ceil((date.getTime() - startOfToday().getTime()) / MS_PER_DAY);
}

// Countdown to midnight of `iso`, expressed as whole weeks/days/hours rather
// than a single unit. Target-is-today is handled as its own state instead of
// falling out of the ms diff, since "midnight of today" is already in the
// past by the time anyone's looking at the page.
export function countdownParts(iso, now = Date.now()) {
  const target = parseDate(iso);
  if (!target) return null;

  const today = startOfToday();
  if (target.getTime() === today.getTime()) {
    return { isToday: true, past: false, weeks: 0, days: 0, hours: 0 };
  }

  const diffMs = target.getTime() - now;
  if (diffMs <= 0) {
    return { isToday: false, past: true, weeks: 0, days: 0, hours: 0 };
  }

  const totalHours = Math.floor(diffMs / 3600000);
  const weeks = Math.floor(totalHours / 168);
  const days = Math.floor((totalHours % 168) / 24);
  const hours = totalHours % 24;
  return { isToday: false, past: false, weeks, days, hours };
}

// A schedule entry is still "upcoming" as long as its window hasn't fully
// closed — for range entries that's windowEnd, for fixed/flexible entries
// (no end bound) it's the chosen date itself.
export function upcomingSchedule(schedule = [], today = startOfToday()) {
  return [...schedule]
    .filter((entry) => {
      const boundary = parseDate(entry.windowEnd || entry.date);
      return boundary && boundary >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
