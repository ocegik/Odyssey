import { fmtNum, fmtPct } from "./format";
import { flattenAnalysisQuestions } from "./detailedAnalysisInsights";

/* Every threshold below is a deliberately coarse "is this worth mentioning?"
   gate, not a statistical test — same philosophy as compute.js's insight
   generators. `significance` (roughly 0-1) only decides ordering/capping
   once a pattern has already cleared its gate. */
const MIN_SET_SIZE = 4;
const HALF_SPLIT_GAP = 0.34;
const SET_TIME_OVER_RATIO = 0.2;
const MIN_HISTORICAL_ACCURACY_FOR_SELECTION_FLAG = 0.65;

const MIN_TOPIC_SAMPLE = 3;
const TOPIC_TIME_OVER_RATIO = 0.15;
const HIGH_GUESS_SHARE = 0.4;
const LOW_GUESS_SHARE = 0.15;
const HIGH_SKIP_RATE = 0.4;
const HIGH_CONCEPT_SHARE = 0.5;
const LOW_CONCEPT_SHARE = 0.2;
const TREND_MIN_DELTA = 0.15;
const CONSISTENCY_MIN_STDDEV = 0.2;

const GUESS_REASONS = ["Intelligent Guess", "Lucky Guess"];

const MAX_SET_INSIGHTS = 8;
const MAX_TOPIC_INSIGHTS = 10;
const MAX_RECOMMENDATIONS = 5;

function avg(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function stdDev(values) {
  if (values.length < 2) return null;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((v) => (v - mean) ** 2)));
}

function groupBy(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

/* ------------------------------------------------------------------ */
/*  Set-level records — one row per set instance (a mock's DILR/VARC   */
/*  set, not an independent question), with position and time splits.  */
/* ------------------------------------------------------------------ */

function accuracyOf(list) {
  const attempted = list.filter((q) => q.attempted);
  const correct = attempted.filter((q) => q.result === "Correct");
  return attempted.length > 0 ? correct.length / attempted.length : null;
}

export function buildSetRecords(questions) {
  const setQuestions = questions.filter((q) => q.blockType === "set");
  const groups = groupBy(setQuestions, (q) => `${q.mockId}::${q.section}::${q.blockId}`);
  const records = [];

  groups.forEach((qs) => {
    const sorted = [...qs].sort((a, b) => a.questionNumber - b.questionNumber);
    const mid = Math.ceil(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const attemptedAll = sorted.filter((q) => q.attempted);
    const correctAll = attemptedAll.filter((q) => q.result === "Correct");
    const timedPairs = sorted.filter((q) => q.timeTaken !== null && q.averageTime !== null);
    const totalTime = timedPairs.reduce((sum, q) => sum + q.timeTaken, 0);
    const totalBenchmark = timedPairs.reduce((sum, q) => sum + q.averageTime, 0);

    records.push({
      mockId: sorted[0].mockId,
      mockLabel: sorted[0].mockLabel,
      section: sorted[0].section,
      blockId: sorted[0].blockId,
      blockName: sorted[0].blockName,
      topic: sorted[0].topic,
      total: sorted.length,
      attempted: attemptedAll.length,
      correct: correctAll.length,
      accuracy: attemptedAll.length > 0 ? correctAll.length / attemptedAll.length : null,
      firstHalfAccuracy: accuracyOf(firstHalf),
      secondHalfAccuracy: accuracyOf(secondHalf),
      totalTime,
      totalBenchmark,
      timeDelta: timedPairs.length > 0 ? totalTime - totalBenchmark : null,
      skipRate: sorted.length > 0 ? (sorted.length - attemptedAll.length) / sorted.length : null,
    });
  });

  return records;
}

/* ------------------------------------------------------------------ */
/*  Topic records — one row per (section, topic), aggregated across    */
/*  every analyzed mock, with a per-mock series for trend/consistency. */
/* ------------------------------------------------------------------ */

export function buildTopicRecords(questions) {
  const tagged = questions.filter((q) => q.topic);
  const groups = groupBy(tagged, (q) => `${q.section}::${q.topic}`);
  const records = [];

  groups.forEach((qs) => {
    const attempted = qs.filter((q) => q.attempted);
    const correct = attempted.filter((q) => q.result === "Correct");
    const wrong = attempted.filter((q) => q.result === "Wrong");
    const skipped = qs.filter((q) => !q.attempted);
    const timed = qs.filter((q) => q.timeTaken !== null && q.averageTime !== null);
    const avgTime = timed.length ? avg(timed.map((q) => q.timeTaken)) : null;
    const avgBenchmark = timed.length ? avg(timed.map((q) => q.averageTime)) : null;

    const guessCount = correct.filter((q) => GUESS_REASONS.includes(q.outcomeReason)).length;
    const conceptCount = wrong.filter((q) => q.outcomeReason === "Concept Error").length;
    const strategicSkipCount = skipped.filter((q) => q.outcomeReason === "Strategic Skip").length;

    const byMock = groupBy(qs, (q) => q.mockId);
    const mockSeries = [...byMock.values()]
      .map((mqs) => ({
        mockId: mqs[0].mockId,
        date: mqs[0].mockDate,
        label: mqs[0].mockLabel,
        accuracy: accuracyOf(mqs),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    records.push({
      section: qs[0].section,
      topic: qs[0].topic,
      total: qs.length,
      attempted: attempted.length,
      correct: correct.length,
      wrong: wrong.length,
      skipped: skipped.length,
      accuracy: attempted.length ? correct.length / attempted.length : null,
      skipRate: qs.length ? skipped.length / qs.length : null,
      avgTime,
      avgBenchmark,
      timeDelta: avgTime !== null && avgBenchmark !== null ? avgTime - avgBenchmark : null,
      guessShare: correct.length ? guessCount / correct.length : null,
      conceptShare: wrong.length ? conceptCount / wrong.length : null,
      strategicSkipCount,
      mockSeries,
      mockCount: byMock.size,
    });
  });

  return records;
}

/* ------------------------------------------------------------------ */
/*  Set-level insight generators                                       */
/* ------------------------------------------------------------------ */

function generateSetPatternInsights(setRecords, topicAccuracyMap) {
  const insights = [];

  setRecords.forEach((set) => {
    if (set.total < MIN_SET_SIZE || set.attempted === 0) return;
    const label = `${set.blockName || "Set"} (${set.mockLabel})`;

    if (set.firstHalfAccuracy !== null && set.secondHalfAccuracy !== null) {
      const gap = set.firstHalfAccuracy - set.secondHalfAccuracy;
      if (gap >= HALF_SPLIT_GAP) {
        insights.push({
          id: `set-fade-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "negative",
          significance: Math.min(1, gap / 0.6),
          title: "Strong start, poor finish",
          text: `In ${label}, you opened strong (${fmtPct(set.firstHalfAccuracy)} on the first half) but faded to ${fmtPct(set.secondHalfAccuracy)} by the end — that reads as fatigue or rushing late in the set, not a knowledge gap.`,
          recommendation: `Practice full-length ${set.topic || set.section} sets to build stamina through the back half, not just the opening questions.`,
        });
      } else if (-gap >= HALF_SPLIT_GAP) {
        insights.push({
          id: `set-recover-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "positive",
          significance: Math.min(1, -gap / 0.6),
          title: "Poor start, strong recovery",
          text: `In ${label}, you struggled early (${fmtPct(set.firstHalfAccuracy)}) but recovered to ${fmtPct(set.secondHalfAccuracy)} — you likely needed a question or two to find the set's pattern before it clicked.`,
          recommendation: `Skim the whole set before answering to find the easiest entry point sooner, instead of solving strictly in question order.`,
        });
      }
    }

    if (set.accuracy !== null && set.attempted >= Math.ceil(set.total * 0.75)) {
      if (set.accuracy >= 0.8) {
        insights.push({
          id: `set-success-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "positive",
          significance: set.accuracy,
          title: "Complete set success",
          text: `${label} was a clean sweep — ${fmtPct(set.accuracy)} accuracy across ${set.attempted}/${set.total} questions attempted.`,
        });
      } else if (set.accuracy <= 0.3) {
        insights.push({
          id: `set-failure-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "negative",
          significance: 1 - set.accuracy,
          title: "Complete set failure",
          text: `${label} didn't pay off — only ${fmtPct(set.accuracy)} accuracy despite attempting ${set.attempted}/${set.total} questions.`,
          recommendation: `If a set like this repeats, cut losses earlier — attempt 1-2 questions to gauge difficulty before committing to the whole set.`,
        });
      }
    }

    if (set.timeDelta !== null && set.totalBenchmark > 0) {
      const overRatio = set.timeDelta / set.totalBenchmark;
      if (overRatio >= SET_TIME_OVER_RATIO && set.accuracy !== null && set.accuracy < 0.5) {
        insights.push({
          id: `set-roi-poor-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "negative",
          significance: Math.min(1, overRatio),
          title: "Poor time return",
          text: `${label} took ${fmtNum(set.totalTime, 0)}s against a ${fmtNum(set.totalBenchmark, 0)}s benchmark, but returned only ${fmtPct(set.accuracy)} accuracy — the extra time didn't convert into marks.`,
          recommendation: `Set a hard time cap for sets like this and bail early if it's not clicking, rather than over-investing.`,
        });
      } else if (overRatio <= -SET_TIME_OVER_RATIO && set.accuracy !== null && set.accuracy >= 0.75) {
        insights.push({
          id: `set-roi-good-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "positive",
          significance: Math.min(1, -overRatio),
          title: "Efficient set",
          text: `${label} was fast and accurate — ${fmtNum(set.totalTime, 0)}s vs a ${fmtNum(set.totalBenchmark, 0)}s benchmark, still landing ${fmtPct(set.accuracy)} accuracy.`,
        });
      }
    }

    if (set.skipRate === 1 && set.topic) {
      const historicalAcc = topicAccuracyMap.get(`${set.section}::${set.topic}`);
      if (historicalAcc !== undefined && historicalAcc !== null && historicalAcc >= MIN_HISTORICAL_ACCURACY_FOR_SELECTION_FLAG) {
        insights.push({
          id: `set-selection-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "negative",
          significance: historicalAcc,
          title: "Set selection",
          text: `You fully skipped ${label} (${set.topic}), but you average ${fmtPct(historicalAcc)} on ${set.topic} when you do attempt it — this may have been a set worth picking.`,
          recommendation: `Scan skipped sets by topic before finalizing your attempt order — don't skip topics you're historically strong in.`,
        });
      }
    }
  });

  return insights;
}

/** Recurring set-pattern behavior across mocks — "consistent behavior", not a one-off. */
function generateRecurringSetPatternInsights(setRecords) {
  const insights = [];
  const byPatternTopic = new Map();

  setRecords.forEach((set) => {
    if (set.firstHalfAccuracy === null || set.secondHalfAccuracy === null || !set.topic) return;
    const gap = set.firstHalfAccuracy - set.secondHalfAccuracy;
    let pattern = null;
    if (gap >= HALF_SPLIT_GAP) pattern = "fade";
    else if (-gap >= HALF_SPLIT_GAP) pattern = "recover";
    if (!pattern) return;

    const key = `${pattern}::${set.section}::${set.topic}`;
    if (!byPatternTopic.has(key)) byPatternTopic.set(key, []);
    byPatternTopic.get(key).push(set);
  });

  byPatternTopic.forEach((sets, key) => {
    if (sets.length < 2) return;
    const [pattern, section, topic] = key.split("::");
    const label = pattern === "fade" ? "fading late in the set" : "needing time to warm up";
    insights.push({
      id: `set-recurring-${key}`,
      section,
      tone: pattern === "fade" ? "negative" : "neutral",
      significance: Math.min(1, sets.length / 5),
      title: "Recurring set pattern",
      text: `This isn't a one-off — you've shown a pattern of ${label} in ${topic} sets across ${sets.length} mocks (${sets.map((s) => s.mockLabel).join(", ")}).`,
      recommendation: pattern === "fade"
        ? `Since this repeats specifically in ${topic}, build targeted stamina practice for ${topic} sets rather than general pacing drills.`
        : null,
    });
  });

  return insights;
}

/* ------------------------------------------------------------------ */
/*  Topic-level insight generators                                     */
/* ------------------------------------------------------------------ */

function generateTopicInsights(topicRecords) {
  const insights = [];

  topicRecords.forEach((t) => {
    if (t.attempted < MIN_TOPIC_SAMPLE) return;

    if (t.accuracy !== null && t.guessShare !== null) {
      if (t.accuracy >= 0.6 && t.guessShare >= HIGH_GUESS_SHARE) {
        insights.push({
          id: `topic-guess-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: t.guessShare,
          title: "Confidence vs accuracy mismatch",
          text: `${t.topic} shows ${fmtPct(t.accuracy)} accuracy, but ${fmtPct(t.guessShare)} of your correct answers there came from guessing, not solving — the score looks stronger than the underlying mastery.`,
          recommendation: `Re-attempt ${t.topic} questions untimed and without guessing to get an honest read on where you actually stand.`,
        });
      } else if (t.accuracy >= 0.7 && t.guessShare <= LOW_GUESS_SHARE) {
        insights.push({
          id: `topic-genuine-${t.section}-${t.topic}`,
          section: t.section,
          tone: "positive",
          significance: t.accuracy,
          title: "Genuine strength",
          text: `${t.topic} is a real strength — ${fmtPct(t.accuracy)} accuracy, and almost none of it from guessing.`,
        });
      }
    }

    if (t.wrong >= 2 && t.conceptShare !== null) {
      if (t.conceptShare >= HIGH_CONCEPT_SHARE) {
        insights.push({
          id: `topic-concept-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: t.conceptShare,
          title: "Conceptual gap",
          text: `${fmtPct(t.conceptShare)} of your wrong answers in ${t.topic} are concept errors, not slips — this reads as a knowledge gap, not a speed problem.`,
          recommendation: `Revisit the core theory for ${t.topic} before drilling more questions — more practice won't fix a concept you haven't learned yet.`,
        });
      } else if (t.conceptShare <= LOW_CONCEPT_SHARE) {
        insights.push({
          id: `topic-execution-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: 1 - t.conceptShare,
          title: "Execution slips, not concepts",
          text: `Your ${t.topic} mistakes are mostly calculation slips, misreads, or time pressure — not concept gaps. You understand it; you're rushing or slipping under time.`,
          recommendation: `Slow down and double-check ${t.topic} questions rather than re-studying the concept — the issue is execution, not understanding.`,
        });
      }
    }

    if (t.timeDelta !== null && t.avgBenchmark) {
      const ratio = t.timeDelta / t.avgBenchmark;
      if (ratio >= TOPIC_TIME_OVER_RATIO) {
        insights.push({
          id: `topic-slow-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: Math.min(1, ratio),
          title: "Time overinvestment",
          text: `You spend ${fmtNum(t.avgTime, 0)}s per ${t.topic} question on average, vs a ${fmtNum(t.avgBenchmark, 0)}s benchmark — accuracy there is ${fmtPct(t.accuracy)}, so the extra time isn't clearly paying off.`,
          recommendation: `Practice ${t.topic} with a visible timer to recalibrate your internal pace.`,
        });
      }
    }

    if (t.skipRate !== null && t.skipRate >= HIGH_SKIP_RATE) {
      if (t.accuracy !== null && t.accuracy >= 0.6) {
        insights.push({
          id: `topic-avoid-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: t.skipRate,
          title: "Avoidance pattern",
          text: `You skip ${fmtPct(t.skipRate)} of ${t.topic} questions, yet score ${fmtPct(t.accuracy)} on the ones you do attempt — this looks like a confidence issue more than an ability gap.`,
          recommendation: `Commit to attempting at least one ${t.topic} question per set before deciding to skip — your track record says it's usually worth it.`,
        });
      } else if (t.accuracy !== null) {
        insights.push({
          id: `topic-avoid-justified-${t.section}-${t.topic}`,
          section: t.section,
          tone: "neutral",
          significance: t.skipRate * 0.6,
          title: "Skip strategy looks calibrated",
          text: `You skip ${fmtPct(t.skipRate)} of ${t.topic} questions, and accuracy stays low (${fmtPct(t.accuracy)}) even when you do attempt them — skipping these looks like the right call for now.`,
        });
      }
    }

    if (t.strategicSkipCount >= 2 && t.accuracy !== null) {
      if (t.accuracy >= 0.65) {
        insights.push({
          id: `topic-decision-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: t.accuracy,
          title: "Reconsider skip strategy",
          text: `You've strategically skipped ${t.topic} questions ${t.strategicSkipCount} times, but you score ${fmtPct(t.accuracy)} on the ones you attempt — those skips are likely costing you marks you could get.`,
          recommendation: `Attempt ${t.topic} before falling back to a strategic skip — your accuracy there doesn't justify avoiding it.`,
        });
      } else if (t.accuracy < 0.4) {
        insights.push({
          id: `topic-decision-good-${t.section}-${t.topic}`,
          section: t.section,
          tone: "positive",
          significance: 1 - t.accuracy,
          title: "Skip strategy validated",
          text: `Your strategic skips on ${t.topic} are well-calibrated — accuracy stays at ${fmtPct(t.accuracy)} even when you attempt it, so passing is the right instinct.`,
        });
      }
    }

    if (t.mockCount >= 3) {
      const half = Math.ceil(t.mockSeries.length / 2);
      const earlier = t.mockSeries.slice(0, half).map((m) => m.accuracy).filter((v) => v !== null);
      const later = t.mockSeries.slice(half).map((m) => m.accuracy).filter((v) => v !== null);
      const earlierAvg = avg(earlier);
      const laterAvg = avg(later);
      if (earlierAvg !== null && laterAvg !== null) {
        const delta = laterAvg - earlierAvg;
        if (Math.abs(delta) >= TREND_MIN_DELTA) {
          insights.push({
            id: `topic-trend-${t.section}-${t.topic}`,
            section: t.section,
            tone: delta > 0 ? "positive" : "negative",
            significance: Math.min(1, Math.abs(delta) / 0.4),
            title: delta > 0 ? "Improving over time" : "Declining over time",
            text: `${t.topic} accuracy has moved from ${fmtPct(earlierAvg)} to ${fmtPct(laterAvg)} across your logged mocks.`,
            recommendation: delta < 0 ? `${t.topic} is trending down — revisit it soon before the gap widens.` : null,
          });
        }
      }
    }

    const accuracySeries = t.mockSeries.map((m) => m.accuracy).filter((v) => v !== null);
    if (accuracySeries.length >= 3) {
      const sd = stdDev(accuracySeries);
      if (sd !== null && sd >= CONSISTENCY_MIN_STDDEV) {
        insights.push({
          id: `topic-volatile-${t.section}-${t.topic}`,
          section: t.section,
          tone: "neutral",
          significance: Math.min(1, sd / 0.35),
          title: "Inconsistent performance",
          text: `${t.topic} accuracy swings widely mock to mock (±${fmtNum(sd * 100, 0)}%) — this reads as inconsistent execution, not a stable skill gap.`,
        });
      }
    }
  });

  return insights;
}

/* ------------------------------------------------------------------ */
/*  Recommendations — actionable next steps, tied to their source      */
/*  insight rather than generated from a separate threshold pass.      */
/* ------------------------------------------------------------------ */

function buildRecommendations(allInsights) {
  const seenText = new Set();
  const recommendations = [];
  allInsights
    .filter((insight) => insight.recommendation)
    .sort((a, b) => b.significance - a.significance)
    .forEach((insight) => {
      if (seenText.has(insight.recommendation)) return;
      seenText.add(insight.recommendation);
      recommendations.push({
        id: `rec-${insight.id}`,
        section: insight.section,
        tone: insight.tone,
        text: insight.recommendation,
        basedOn: insight.title,
      });
    });
  return recommendations.slice(0, MAX_RECOMMENDATIONS);
}

export function buildAdvancedInsights(mocks) {
  const questions = flattenAnalysisQuestions(mocks);
  const setRecords = buildSetRecords(questions);
  const topicRecords = buildTopicRecords(questions);
  const topicAccuracyMap = new Map(topicRecords.map((t) => [`${t.section}::${t.topic}`, t.accuracy]));

  const setInsights = [
    ...generateSetPatternInsights(setRecords, topicAccuracyMap),
    ...generateRecurringSetPatternInsights(setRecords),
  ]
    .sort((a, b) => b.significance - a.significance)
    .slice(0, MAX_SET_INSIGHTS);

  const topicInsights = generateTopicInsights(topicRecords)
    .sort((a, b) => b.significance - a.significance)
    .slice(0, MAX_TOPIC_INSIGHTS);

  const recommendations = buildRecommendations([...setInsights, ...topicInsights]);

  return { setRecords, topicRecords, setInsights, topicInsights, recommendations };
}
