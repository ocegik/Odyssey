export const QUICK_MATH_LEVELS = [
  {
    id: "foundation",
    label: "Foundation",
    description: "Build reliable number sense with familiar calculations.",
    unlockAfter: null,
    unlockAt: 0,
  },
  {
    id: "speed",
    label: "Speed",
    description: "Use shortcuts for faster mental arithmetic.",
    unlockAfter: "foundation",
    unlockAt: 8,
  },
  {
    id: "challenge",
    label: "Challenge",
    description: "Handle CAT-style multi-step calculations under pressure.",
    unlockAfter: "speed",
    unlockAt: 12,
  },
];

const LEVEL_IDS = new Set(QUICK_MATH_LEVELS.map((level) => level.id));

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function isoDay(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function emptyLevelProgress() {
  return { correct: 0, total: 0, bestStreak: 0, totalTimeMs: 0 };
}

export function emptyQuickMathProgress() {
  return {
    version: 1,
    totalAnswered: 0,
    correct: 0,
    xp: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPracticedOn: null,
    dailyActivity: {},
    levels: Object.fromEntries(
      QUICK_MATH_LEVELS.map((level) => [level.id, emptyLevelProgress()]),
    ),
  };
}

export function normalizeQuickMathProgress(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const fallback = emptyQuickMathProgress();
  const levels = Object.fromEntries(
    QUICK_MATH_LEVELS.map((level) => {
      const saved = source.levels?.[level.id] || {};
      const total = nonNegativeInteger(saved.total);
      const correct = Math.min(nonNegativeInteger(saved.correct), total);
      return [level.id, {
        correct,
        total,
        bestStreak: nonNegativeInteger(saved.bestStreak),
        totalTimeMs: nonNegativeInteger(saved.totalTimeMs),
      }];
    }),
  );
  const totalAnswered = Object.values(levels).reduce((total, level) => total + level.total, 0);
  const correct = Object.values(levels).reduce((total, level) => total + level.correct, 0);
  const dailyActivity = Object.fromEntries(
    Object.entries(source.dailyActivity || {})
      .filter(([day, activity]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && activity && typeof activity === "object")
      .sort(([first], [second]) => second.localeCompare(first))
      .slice(0, 90)
      .map(([day, activity]) => {
        const total = nonNegativeInteger(activity.total);
        return [day, { total, correct: Math.min(nonNegativeInteger(activity.correct), total) }];
      }),
  );

  return {
    ...fallback,
    totalAnswered,
    correct,
    // XP is intentionally derived from scored work so an old/corrupt cache
    // cannot create a progression shortcut.
    xp: correct * 10,
    currentStreak: nonNegativeInteger(source.currentStreak),
    bestStreak: Math.max(nonNegativeInteger(source.bestStreak), nonNegativeInteger(source.currentStreak)),
    lastPracticedOn: /^\d{4}-\d{2}-\d{2}$/.test(source.lastPracticedOn || "") ? source.lastPracticedOn : null,
    dailyActivity,
    levels,
  };
}

export function getLevelProgress(progress, levelId) {
  return normalizeQuickMathProgress(progress).levels[levelId] || emptyLevelProgress();
}

export function isLevelUnlocked(progress, levelId) {
  const level = QUICK_MATH_LEVELS.find((item) => item.id === levelId);
  if (!level || !level.unlockAfter) return true;
  return getLevelProgress(progress, level.unlockAfter).correct >= level.unlockAt;
}

export function levelUnlockMessage(progress, levelId) {
  const level = QUICK_MATH_LEVELS.find((item) => item.id === levelId);
  if (!level?.unlockAfter) return "Available now";
  const completed = getLevelProgress(progress, level.unlockAfter).correct;
  const remaining = Math.max(0, level.unlockAt - completed);
  return remaining === 0
    ? "Available now"
    : `${remaining} more correct in ${QUICK_MATH_LEVELS.find((item) => item.id === level.unlockAfter)?.label}`;
}

export function recordQuickMathResult(progress, { levelId, correct, elapsedMs, date = new Date() }) {
  if (!LEVEL_IDS.has(levelId)) return normalizeQuickMathProgress(progress);
  const current = normalizeQuickMathProgress(progress);
  const day = isoDay(date);
  const nextStreak = correct ? current.currentStreak + 1 : 0;
  const level = current.levels[levelId];
  const activity = current.dailyActivity[day] || { total: 0, correct: 0 };

  return {
    ...current,
    totalAnswered: current.totalAnswered + 1,
    correct: current.correct + (correct ? 1 : 0),
    xp: current.xp + (correct ? 10 : 0),
    currentStreak: nextStreak,
    bestStreak: Math.max(current.bestStreak, nextStreak),
    lastPracticedOn: day,
    dailyActivity: {
      ...current.dailyActivity,
      [day]: {
        total: activity.total + 1,
        correct: activity.correct + (correct ? 1 : 0),
      },
    },
    levels: {
      ...current.levels,
      [levelId]: {
        correct: level.correct + (correct ? 1 : 0),
        total: level.total + 1,
        bestStreak: Math.max(level.bestStreak, nextStreak),
        totalTimeMs: level.totalTimeMs + Math.max(0, Math.round(Number(elapsedMs) || 0)),
      },
    },
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(items) {
  return items[randomInt(0, items.length - 1)];
}

function question(text, answer, hint) {
  return { text, answer, hint };
}

const GENERATORS = {
  foundation() {
    return sample([
      () => {
        const first = randomInt(6, 19);
        const second = randomInt(4, 12);
        return question(`${first} × ${second}`, first * second, "Break one factor into tens and units.");
      },
      () => {
        const number = randomInt(8, 35);
        return question(`${number}²`, number ** 2, "Square the nearest easy number, then adjust.");
      },
      () => {
        const percentage = sample([10, 20, 25, 40, 50, 75]);
        const base = randomInt(4, 20) * 10;
        return question(`${percentage}% of ${base}`, (percentage / 100) * base, "Use 10%, 25%, or 50% as an anchor.");
      },
    ])();
  },
  speed() {
    return sample([
      () => {
        const offset = randomInt(2, 9);
        return question(`${100 - offset} × ${100 + offset}`, 10000 - offset ** 2, "Use (a − b)(a + b) = a² − b².");
      },
      () => {
        const tens = randomInt(2, 8) * 10;
        const unit = randomInt(1, 9);
        return question(`${tens + unit} × ${tens + 10 - unit}`, tens ** 2 + tens * 10 + unit * (10 - unit), "Both numbers add to the next multiple of ten.");
      },
      () => {
        const denominator = sample([4, 5, 8, 10, 20]);
        const numerator = randomInt(1, denominator - 1);
        const base = denominator * randomInt(8, 30);
        return question(`${numerator}/${denominator} of ${base}`, (numerator / denominator) * base, "Divide by the denominator first.");
      },
    ])();
  },
  challenge() {
    return sample([
      () => {
        const base = randomInt(12, 50) * 20;
        const first = sample([10, 15, 20, 25]);
        const second = sample([5, 10, 20]);
        const answer = base * (1 + first / 100) * (1 + second / 100);
        return question(`${base} increased by ${first}% then ${second}%`, answer, "Apply each percentage to the new value.");
      },
      () => {
        const original = randomInt(20, 70) * 10;
        const first = sample([10, 20, 25]);
        const second = sample([10, 20]);
        const answer = original * (1 - first / 100) * (1 - second / 100);
        return question(`${original} after ${first}% and ${second}% successive discounts`, answer, "Successive discounts multiply; they do not add.");
      },
      () => {
        const value = randomInt(12, 45);
        const result = randomInt(3, 12) * 5;
        return question(`If ${value}% of n = ${result}, n = ?`, (result * 100) / value, "Turn the percentage into a fraction and isolate n.");
      },
    ])();
  },
};

export function makeQuickMathQuestion(levelId) {
  return (GENERATORS[levelId] || GENERATORS.foundation)();
}

export function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function accuracy(correct, total) {
  return total ? Math.round((correct / total) * 100) : 0;
}
