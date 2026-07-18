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

// "29 Nov 2026" — a year-qualified sibling of lib/format.js's fmtDate, which
// stays short-form (no year) since it's used all over for compact contexts
// (chart labels, table cells) where the year would just be noise.
export function fmtDateLong(iso) {
  if (!iso) return "—";
  const d = parseDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Compact relative-day label for a pill/badge, not a full countdown.
export function relativeDayLabel(iso) {
  const d = daysUntil(iso);
  if (d === null) return null;
  if (d < 0) return "Passed";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 14) return `In ${d}d`;
  return `In ${Math.round(d / 7)}w`;
}

// Rough "how far through prep" read for the CAT Progress bar. There's no
// stored prep-start date anywhere in the app, so this is deliberately
// approximate: prep is assumed to start the most recent June 1 on or before
// the exam date (typical CAT prep cycle), not a real user-set date.
export function prepProgressPercent(catTargetDate, now = Date.now()) {
  const target = parseDate(catTargetDate);
  if (!target) return null;
  const startYear = target.getMonth() >= 5 ? target.getFullYear() : target.getFullYear() - 1;
  const start = new Date(startYear, 5, 1);
  const total = target.getTime() - start.getTime();
  if (total <= 0) return null;
  return Math.max(0, Math.min(100, ((now - start.getTime()) / total) * 100));
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
