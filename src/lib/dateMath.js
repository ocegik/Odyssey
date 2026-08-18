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

// CAT is conventionally held on the last Sunday of November. Keeping this
// calculation here makes the target year the sole source of truth everywhere
// that needs the exam date.
export function catExamDateForYear(targetYear) {
  const year = Number(targetYear);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return "";

  const lastDayOfNovember = new Date(year, 10, 30);
  lastDayOfNovember.setDate(lastDayOfNovember.getDate() - lastDayOfNovember.getDay());

  const month = String(lastDayOfNovember.getMonth() + 1).padStart(2, "0");
  const day = String(lastDayOfNovember.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

// Measures a student's actual preparation window rather than assuming a
// generic CAT cycle. Values are capped so the UI remains useful before the
// start date and after the exam.
export function prepProgressPercent(preparationStartDate, catTargetDate, now = Date.now()) {
  const start = parseDate(preparationStartDate);
  const target = parseDate(catTargetDate);
  if (!start || !target) return null;
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
