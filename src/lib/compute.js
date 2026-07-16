import { SECTIONS } from "../constants";
import { fmtDate, fmtPct, fmtNum } from "./format";

export function computeDerived(e) {
  const attempted = e.attemptedMCQ + e.attemptedTITA;
  const right = e.rightMCQ + e.rightTITA;
  const unattempted = e.totalQuestions - attempted;
  const computedMarks = e.rightMCQ * 3 + e.rightTITA * 3 - e.wrongMCQ * 1 + e.wrongTITA * 0;
  const totalMarks = e.manualTotalMarks !== null && e.manualTotalMarks !== undefined ? e.manualTotalMarks : computedMarks;
  const overallAccuracy = attempted > 0 ? right / attempted : null;
  const mcqAccuracy = e.attemptedMCQ > 0 ? e.rightMCQ / e.attemptedMCQ : null;
  const titaAccuracy = e.attemptedTITA > 0 ? e.rightTITA / e.attemptedTITA : null;
  const attemptRate = e.scoreEntryMode === "score-only" || e.totalQuestions <= 0 ? null : attempted / e.totalQuestions;
  const marksPerAttempt = attempted > 0 ? totalMarks / attempted : null;
  const negMarksLost = e.wrongMCQ * 1;
  const hardnessRatio = e.topperScore ? totalMarks / e.topperScore : null;
  return {
    ...e, attempted, unattempted, totalMarks, overallAccuracy, mcqAccuracy,
    titaAccuracy, attemptRate, marksPerAttempt, negMarksLost, hardnessRatio,
  };
}

export const byDateAsc = (a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1);

export function rollingSeries(sortedEntries, window = 5) {
  return sortedEntries.map((e, i, arr) => {
    const slice = arr.slice(Math.max(0, i - (window - 1)), i + 1);
    const avg = (key) => {
      const vals = slice.map((s) => s[key]).filter((v) => v !== null && v !== undefined && !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      ...e,
      rollAccuracy: avg("overallAccuracy"),
      rollAttemptRate: avg("attemptRate"),
      rollMcqAccuracy: avg("mcqAccuracy"),
      rollTitaAccuracy: avg("titaAccuracy"),
      rollMarks: avg("totalMarks"),
      rollMarksPerAttempt: avg("marksPerAttempt"),
    };
  });
}

export function buildMockPivot(mockRecords) {
  const mocks = mockRecords.map((mock) => {
    const row = {
      key: mock.id,
      id: mock.id,
      date: mock.date,
      source: mock.source,
      createdAt: mock.createdAt,
      analysis: mock.analysis || null,
      manualTotalMarks: mock.manualTotalMarks ?? null,
      scoreEntryMode: mock.scoreEntryMode || null,
    };
    SECTIONS.forEach((section) => {
      row[section] = mock.sections[section] || null;
    });
    return row;
  }).sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));

  return mocks.map((m) => ({ ...m, label: `${fmtDate(m.date)} · ${m.source}` }));
}

export function buildSeries(mocks, accessor) {
  return mocks.map((m) => ({
    label: m.label,
    VARC: m.VARC ? accessor(m.VARC) : null,
    DILR: m.DILR ? accessor(m.DILR) : null,
    Quant: m.Quant ? accessor(m.Quant) : null,
  }));
}

export function analyzeWeakest(entriesWithComputed) {
  const perSection = {};
  SECTIONS.forEach((sec) => {
    const list = rollingSeries(entriesWithComputed.filter((e) => e.section === sec).sort(byDateAsc));
    perSection[sec] = { list, latest: list.length ? list[list.length - 1] : null };
  });
  const withData = SECTIONS.filter((s) => perSection[s].latest);
  if (withData.length === 0) return null;

  const scored = withData.map((s) => {
    const l = perSection[s].latest;
    const acc = l.rollAccuracy ?? 0;
    const ar = l.rollAttemptRate ?? 0;
    return { section: s, score: acc * ar, acc, ar, mcqAcc: l.rollMcqAccuracy, titaAcc: l.rollTitaAccuracy };
  });
  const bySc = [...scored].sort((a, b) => a.score - b.score);
  const weakest = bySc[0];
  const lowestAcc = [...scored].sort((a, b) => a.acc - b.acc)[0];
  const lowestAR = [...scored].sort((a, b) => a.ar - b.ar)[0];

  let driver = "a combined effect";
  if (lowestAcc.section === weakest.section && lowestAR.section === weakest.section) driver = "both an accuracy problem and an attempt-rate problem";
  else if (lowestAcc.section === weakest.section) driver = "primarily an accuracy problem";
  else if (lowestAR.section === weakest.section) driver = "primarily an attempt-rate problem";

  let subtype = null;
  if (weakest.mcqAcc !== null && weakest.titaAcc !== null) subtype = weakest.mcqAcc <= weakest.titaAcc ? "MCQ" : "TITA";
  else if (weakest.mcqAcc !== null) subtype = "MCQ";
  else if (weakest.titaAcc !== null) subtype = "TITA";

  let trendNote = "";
  const list = perSection[weakest.section].list;
  if (subtype && list.length >= 2) {
    const key = subtype === "MCQ" ? "rollMcqAccuracy" : "rollTitaAccuracy";
    const recent = list[list.length - 1][key];
    const priorIdx = Math.max(0, list.length - 4);
    const prior = list[priorIdx][key];
    if (recent !== null && prior !== null && priorIdx !== list.length - 1) {
      if (recent < prior - 0.03) trendNote = ` ${subtype} accuracy has slipped over the last few mocks (${fmtPct(prior)} → ${fmtPct(recent)}).`;
      else if (recent > prior + 0.03) trendNote = ` ${subtype} accuracy is actually trending up (${fmtPct(prior)} → ${fmtPct(recent)}), even though it's still the softest spot.`;
      else trendNote = ` ${subtype} accuracy has held steady around ${fmtPct(recent)}.`;
    }
  }

  const note = `${weakest.section} is the weakest section right now — rolling accuracy of ${fmtPct(weakest.acc)} and attempt rate of ${fmtPct(weakest.ar)} suggest ${driver}${subtype ? `, with ${subtype} being the weaker half.` : "."}${trendNote}`;
  return { weakestSection: weakest.section, scored, note };
}

/* ------------------------------------------------------------------ */
/*  Insight feed                                                       */
/* ------------------------------------------------------------------ */

/* Every threshold below is a deliberately coarse "is this worth
   mentioning?" gate, not a statistical test — this is a briefing, not a
   dashboard of p-values. `significance` (roughly 0–1) only decides
   ordering/capping once a pattern has already cleared its gate. */
const INSIGHT_MIN_TREND_MOCKS = 3;
const INSIGHT_TREND_WINDOW = 5;
const ACCURACY_TREND_MIN_DELTA = 0.04;
const MPA_DEVIATION_MIN_RATIO = 0.15;
const ATTEMPT_RATE_JUMP_MIN_DELTA = 0.12;
const MCQ_TITA_GAP_WIDEN_MIN_DELTA = 0.08;
const PERCENTILE_VS_MARKS_MIN_PCTL_DELTA = 3;
const MAX_INSIGHTS = 4;

const avgOf = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

/** Rolling accuracy now vs ~5 mocks back — is the section trending up or down? */
function accuracyTrendInsight(section, list) {
  if (list.length < INSIGHT_MIN_TREND_MOCKS) return null;
  const startIdx = Math.max(0, list.length - INSIGHT_TREND_WINDOW);
  if (startIdx === list.length - 1) return null;
  const recent = list[list.length - 1].rollAccuracy;
  const prior = list[startIdx].rollAccuracy;
  if (recent === null || prior === null) return null;
  const delta = recent - prior;
  if (Math.abs(delta) < ACCURACY_TREND_MIN_DELTA) return null;
  const span = list.length - 1 - startIdx;
  return {
    id: `${section}-accuracy-trend`, section, tone: delta > 0 ? "positive" : "negative",
    significance: Math.min(1, Math.abs(delta) / 0.3),
    text: `${section} accuracy is trending ${delta > 0 ? "up" : "down"} over the last ${span} mocks — ${fmtPct(prior)} → ${fmtPct(recent)}.`,
  };
}

/** Latest mock's marks-per-attempt vs that section's own historical average. */
function marksPerAttemptInsight(section, list) {
  if (list.length < 3) return null;
  const latest = list[list.length - 1];
  if (latest.marksPerAttempt === null || latest.marksPerAttempt === undefined) return null;
  const priorValues = list.slice(0, -1).map((e) => e.marksPerAttempt).filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (priorValues.length < 2) return null;
  const histAvg = avgOf(priorValues);
  if (!histAvg) return null;
  const ratio = (latest.marksPerAttempt - histAvg) / Math.abs(histAvg);
  if (Math.abs(ratio) < MPA_DEVIATION_MIN_RATIO) return null;
  return {
    id: `${section}-marks-per-attempt`, section, tone: ratio > 0 ? "positive" : "negative",
    significance: Math.min(1, Math.abs(ratio) / 0.5),
    text: `${section} marks-per-attempt is ${ratio > 0 ? "above" : "below"} its own average lately — ${fmtNum(latest.marksPerAttempt, 2)} vs a usual ${fmtNum(histAvg, 2)} marks/attempt.`,
  };
}

/** Sharp mock-to-mock swing in attempt rate (not smoothed — this is about a sudden change). */
function attemptRateJumpInsight(section, list) {
  if (list.length < 2) return null;
  const latest = list[list.length - 1];
  const prev = list[list.length - 2];
  if (latest.attemptRate === null || prev.attemptRate === null) return null;
  const delta = latest.attemptRate - prev.attemptRate;
  if (Math.abs(delta) < ATTEMPT_RATE_JUMP_MIN_DELTA) return null;
  return {
    id: `${section}-attempt-rate-jump`, section, tone: delta > 0 ? "positive" : "negative",
    significance: Math.min(1, Math.abs(delta) / 0.3),
    text: `${section} attempt rate ${delta > 0 ? "jumped" : "dropped"} sharply in the latest mock — ${fmtPct(prev.attemptRate)} → ${fmtPct(latest.attemptRate)}.`,
  };
}

/** Is the MCQ/TITA accuracy split within a section pulling further apart over time? */
function mcqTitaGapInsight(section, list) {
  if (list.length < INSIGHT_MIN_TREND_MOCKS) return null;
  const startIdx = Math.max(0, list.length - INSIGHT_TREND_WINDOW);
  if (startIdx === list.length - 1) return null;
  const latest = list[list.length - 1];
  const prior = list[startIdx];
  if ([latest.mcqAccuracy, latest.titaAccuracy, prior.mcqAccuracy, prior.titaAccuracy].some((v) => v === null || v === undefined)) return null;
  const gapNow = latest.mcqAccuracy - latest.titaAccuracy;
  const gapPrior = prior.mcqAccuracy - prior.titaAccuracy;
  const widened = Math.abs(gapNow) - Math.abs(gapPrior);
  if (widened < MCQ_TITA_GAP_WIDEN_MIN_DELTA) return null;
  const weaker = gapNow < 0 ? "TITA" : "MCQ";
  return {
    id: `${section}-mcq-tita-gap`, section, tone: "negative",
    significance: Math.min(1, widened / 0.25),
    text: `${section}'s MCQ vs TITA accuracy gap is widening — ${weaker} is falling further behind, now ${fmtPct(Math.abs(gapNow))} apart.`,
  };
}

/** Percentile moving opposite to marks between the last two logged-percentile mocks — implies the paper's difficulty shifted. */
function percentileVsMarksInsight(section, list) {
  const withPercentile = list.filter((e) => e.percentile !== null && e.percentile !== undefined);
  if (withPercentile.length < 2) return null;
  const latest = withPercentile[withPercentile.length - 1];
  const prev = withPercentile[withPercentile.length - 2];
  const pctlDelta = latest.percentile - prev.percentile;
  const marksDelta = latest.totalMarks - prev.totalMarks;
  if (Math.abs(pctlDelta) < PERCENTILE_VS_MARKS_MIN_PCTL_DELTA) return null;
  if ((pctlDelta > 0 && marksDelta >= 0) || (pctlDelta < 0 && marksDelta <= 0)) return null;
  const harderPaper = pctlDelta > 0;
  return {
    id: `${section}-percentile-vs-marks`, section, tone: harderPaper ? "positive" : "negative",
    significance: Math.min(1, Math.abs(pctlDelta) / 15),
    text: harderPaper
      ? `${section} percentile improved (${fmtNum(prev.percentile, 1)} → ${fmtNum(latest.percentile, 1)}) despite lower marks — likely a harder paper.`
      : `${section} marks improved but percentile fell (${fmtNum(prev.percentile, 1)} → ${fmtNum(latest.percentile, 1)}) — likely an easier paper for everyone.`,
  };
}

/**
 * Short, plain-language briefing of 0-4 data-driven observations, pulled
 * from the same per-section rolling series `sectionStats` already
 * computes. One insight type can only appear once (its single most
 * significant section wins) so the feed reads as a varied briefing
 * rather than one section dominating every slot.
 */
export function generateInsights(sectionStats) {
  const generators = [accuracyTrendInsight, marksPerAttemptInsight, attemptRateJumpInsight, mcqTitaGapInsight, percentileVsMarksInsight];

  const winners = generators
    .map((fn) => {
      let best = null;
      SECTIONS.forEach((sec) => {
        const list = sectionStats[sec]?.list || [];
        if (list.length === 0) return;
        const candidate = fn(sec, list);
        if (candidate && (!best || candidate.significance > best.significance)) best = candidate;
      });
      return best;
    })
    .filter(Boolean);

  return winners.sort((a, b) => b.significance - a.significance).slice(0, MAX_INSIGHTS);
}

/* ------------------------------------------------------------------ */
/*  Section "shape" radar data                                         */
/* ------------------------------------------------------------------ */

/* Marks-per-attempt has no fixed scale like a percentage (a right MCQ
   answer is +3, a wrong one -1, so per-attempt marks roughly range from
   -1 to 3). Normalizing onto 0-100 lets it share a radar axis with
   accuracy and attempt rate, which are already percentages. */
const MPA_NORMALIZE_MIN = -1;
const MPA_NORMALIZE_MAX = 3;
const normalizeMarksPerAttempt = (mpa) => {
  if (mpa === null || mpa === undefined || isNaN(mpa)) return null;
  const pct = ((mpa - MPA_NORMALIZE_MIN) / (MPA_NORMALIZE_MAX - MPA_NORMALIZE_MIN)) * 100;
  return +Math.max(0, Math.min(100, pct)).toFixed(1);
};

/**
 * One row per metric (recharts' RadarChart wants that shape, mirroring
 * how buildSeries gives one row per mock) with each section's latest
 * rolling value on a shared 0-100 scale.
 */
export function buildRadarData(sectionStats) {
  const pct = (v) => (v === null || v === undefined ? null : +(v * 100).toFixed(1));
  const row = (metric, accessor) => {
    const out = { metric };
    SECTIONS.forEach((s) => {
      const latest = sectionStats[s]?.latest;
      out[s] = latest ? accessor(latest) : null;
    });
    return out;
  };
  return [
    row("Accuracy", (l) => pct(l.rollAccuracy)),
    row("Attempt rate", (l) => pct(l.rollAttemptRate)),
    row("Marks/attempt", (l) => normalizeMarksPerAttempt(l.rollMarksPerAttempt)),
  ];
}

/* "Last 2-3 weeks" window used for the recent-frequency pacing read. */
const PACING_WINDOW_DAYS = 18;
/* Rough, deliberately coarse thresholds — this is a pace nudge, not a plan. */
const PACING_LIGHT_PER_WEEK = 1;
const PACING_SOLID_PER_WEEK = 2;

/**
 * Rough exam-pacing read: days/weeks left, how many mocks were logged in
 * the last ~2-3 weeks, and a plain-language note on whether that recent
 * frequency looks light or solid given the time left. Intentionally simple
 * — no attempt to project a "mocks needed" total or similar.
 */
export function computePacing(mocks, examDate) {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  if (isNaN(exam.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 86400000;
  const daysRemaining = Math.round((exam.getTime() - today.getTime()) / msPerDay);
  const weeksRemaining = daysRemaining / 7;

  const windowStart = new Date(today.getTime() - PACING_WINDOW_DAYS * msPerDay);
  const recentMocks = mocks.filter((m) => {
    const d = new Date(`${m.date}T00:00:00`);
    return !isNaN(d.getTime()) && d >= windowStart && d <= today;
  }).length;
  const recentPerWeek = recentMocks / (PACING_WINDOW_DAYS / 7);

  let note;
  if (daysRemaining < 0) {
    note = "Exam date has passed.";
  } else if (daysRemaining === 0) {
    note = "Exam is today.";
  } else if (recentMocks === 0) {
    note = "No mocks logged in the last ~3 weeks — worth picking the pace back up.";
  } else if (recentPerWeek < PACING_LIGHT_PER_WEEK) {
    note = `~${recentPerWeek.toFixed(1)}/week recently — a bit light with ${Math.max(1, Math.round(weeksRemaining))} weeks left.`;
  } else if (recentPerWeek < PACING_SOLID_PER_WEEK) {
    note = `~${recentPerWeek.toFixed(1)}/week recently — roughly steady pace.`;
  } else {
    note = `~${recentPerWeek.toFixed(1)}/week recently — solid pace.`;
  }

  return { daysRemaining, weeksRemaining, recentMocks, recentPerWeek, note };
}
