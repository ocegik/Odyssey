import { fmtNum, fmtPct } from "./format";
import { flattenAnalysisQuestions } from "./detailedAnalysisInsights";
import { avg, stdDev, accuracyOf } from "./aggregate";

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

function topicLookupKey(section, topicId, topic) {
  return `${section}::${topicId ? `id:${topicId}` : `legacy:${topic}`}`;
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

function accuracyOfQuestions(list) {
  const attempted = list.filter((q) => q.attempted);
  const correct = attempted.filter((q) => q.result === "Correct");
  return accuracyOf(correct.length, attempted.length);
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
      topicId: sorted[0].topicId || null,
      total: sorted.length,
      attempted: attemptedAll.length,
      correct: correctAll.length,
      accuracy: accuracyOf(correctAll.length, attemptedAll.length),
      firstHalfAccuracy: accuracyOfQuestions(firstHalf),
      secondHalfAccuracy: accuracyOfQuestions(secondHalf),
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
  const tagged = questions.filter((q) => q.topic || q.topicId);
  const groups = groupBy(tagged, (q) => (
    `${q.section}::${q.topicId ? `id:${q.topicId}` : `legacy:${q.topic}`}`
  ));
  const records = [];

  groups.forEach((qs) => {
    const attempted = qs.filter((q) => q.attempted);
    const correct = attempted.filter((q) => q.result === "Correct");
    const wrong = attempted.filter((q) => q.result === "Wrong");
    // A real Skipped only — excludes "Unreviewed" placeholders from a mock
    // that's still mid-review, which aren't a skip pattern, just missing data.
    const skipped = qs.filter((q) => q.result === "Skipped");
    const reviewed = qs.filter((q) => q.result !== "Unreviewed");
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
        accuracy: accuracyOfQuestions(mqs),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    records.push({
      section: qs[0].section,
      topic: qs[0].topic,
      topicId: qs[0].topicId || null,
      total: qs.length,
      attempted: attempted.length,
      correct: correct.length,
      wrong: wrong.length,
      skipped: skipped.length,
      accuracy: accuracyOf(correct.length, attempted.length),
      skipRate: reviewed.length ? skipped.length / reviewed.length : null,
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
          title: "Accuracy fell late in the set",
          text: `${label}: accuracy moved from ${fmtPct(set.firstHalfAccuracy)} in the first half to ${fmtPct(set.secondHalfAccuracy)} in the second. The pattern points to late-set pacing or fatigue rather than a clear knowledge gap.`,
          recommendation: `Practise full-length ${set.topic || set.section} sets and review how your pace changes in the second half.`,
        });
      } else if (-gap >= HALF_SPLIT_GAP) {
        insights.push({
          id: `set-recover-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "positive",
          significance: Math.min(1, -gap / 0.6),
          title: "Accuracy improved within the set",
          text: `${label}: accuracy rose from ${fmtPct(set.firstHalfAccuracy)} in the first half to ${fmtPct(set.secondHalfAccuracy)} in the second. You may be spending too long finding an entry point.`,
          recommendation: `Scan the full set before committing to a question so you can choose an entry point sooner.`,
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
          title: "Strong set conversion",
          text: `${label}: ${fmtPct(set.accuracy)} accuracy across ${set.attempted} of ${set.total} questions attempted.`,
        });
      } else if (set.accuracy <= 0.3) {
        insights.push({
          id: `set-failure-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "negative",
          significance: 1 - set.accuracy,
          title: "Low return from this set",
          text: `${label}: ${fmtPct(set.accuracy)} accuracy after attempting ${set.attempted} of ${set.total} questions.`,
          recommendation: `If this repeats, test the set with one or two questions before committing more time to it.`,
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
          title: "Time did not convert into marks",
          text: `${label} took ${fmtNum(set.totalTime, 0)}s against a ${fmtNum(set.totalBenchmark, 0)}s benchmark, with ${fmtPct(set.accuracy)} accuracy.`,
          recommendation: `Set a time limit for similar sets and move on if the approach is not becoming clear.`,
        });
      } else if (overRatio <= -SET_TIME_OVER_RATIO && set.accuracy !== null && set.accuracy >= 0.75) {
        insights.push({
          id: `set-roi-good-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "positive",
          significance: Math.min(1, -overRatio),
          title: "Efficient set",
          text: `${label}: ${fmtNum(set.totalTime, 0)}s against a ${fmtNum(set.totalBenchmark, 0)}s benchmark, with ${fmtPct(set.accuracy)} accuracy.`,
        });
      }
    }

    if (set.skipRate === 1 && set.topic) {
      const historicalAcc = topicAccuracyMap.get(topicLookupKey(set.section, set.topicId, set.topic));
      if (historicalAcc !== undefined && historicalAcc !== null && historicalAcc >= MIN_HISTORICAL_ACCURACY_FOR_SELECTION_FLAG) {
        insights.push({
          id: `set-selection-${set.mockId}-${set.blockId}`,
          section: set.section,
          tone: "negative",
          significance: historicalAcc,
          title: "Set selection",
          text: `You skipped ${label} (${set.topic}), although your recorded accuracy for ${set.topic} is ${fmtPct(historicalAcc)} when attempted. This set may have been worth considering.`,
          recommendation: `Before finalising your attempt order, review skipped sets in topics where your recorded accuracy is stronger.`,
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
      text: `This pattern appears in ${topic} sets across ${sets.length} mocks (${sets.map((s) => s.mockLabel).join(", ")}). You are ${label}.`,
      recommendation: pattern === "fade"
        ? `Build targeted stamina practice for ${topic} sets and track whether the late-set drop narrows.`
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
          title: "Accuracy depends heavily on guesses",
          text: `${t.topic} shows ${fmtPct(t.accuracy)} accuracy, but ${fmtPct(t.guessShare)} of correct answers were marked as guesses. The score may overstate how reliably you can solve these questions.`,
          recommendation: `Re-attempt ${t.topic} questions untimed and without guessing to assess the underlying method.`,
        });
      } else if (t.accuracy >= 0.7 && t.guessShare <= LOW_GUESS_SHARE) {
        insights.push({
          id: `topic-genuine-${t.section}-${t.topic}`,
          section: t.section,
          tone: "positive",
          significance: t.accuracy,
          title: "Reliable topic strength",
          text: `${t.topic}: ${fmtPct(t.accuracy)} accuracy, with very few correct answers marked as guesses.`,
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
          text: `${fmtPct(t.conceptShare)} of wrong answers in ${t.topic} are recorded as concept errors. The data points to a knowledge gap more than a pace issue.`,
          recommendation: `Revisit the core concepts for ${t.topic}, then use practice questions to check whether the gap has closed.`,
        });
      } else if (t.conceptShare <= LOW_CONCEPT_SHARE) {
        insights.push({
          id: `topic-execution-${t.section}-${t.topic}`,
          section: t.section,
          tone: "negative",
          significance: 1 - t.conceptShare,
          title: "Execution slips, not concepts",
          text: `Most ${t.topic} mistakes are recorded as calculation slips, misreads, or time pressure rather than concept errors. The issue appears to be execution.`,
          recommendation: `Use a timed review routine for ${t.topic}: check the reading of the question, calculations, and final selection before submitting.`,
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
          text: `You spend ${fmtNum(t.avgTime, 0)}s per ${t.topic} question on average, against a ${fmtNum(t.avgBenchmark, 0)}s benchmark. Recorded accuracy is ${fmtPct(t.accuracy)}.`,
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
          text: `You skip ${fmtPct(t.skipRate)} of ${t.topic} questions, but record ${fmtPct(t.accuracy)} accuracy on those you attempt. Your selection may be more cautious than your results support.`,
          recommendation: `Before skipping the topic, test one ${t.topic} question and use the initial approach to decide whether to continue.`,
        });
      } else if (t.accuracy !== null) {
        insights.push({
          id: `topic-avoid-justified-${t.section}-${t.topic}`,
          section: t.section,
          tone: "neutral",
          significance: t.skipRate * 0.6,
          title: "Skip strategy looks calibrated",
          text: `You skip ${fmtPct(t.skipRate)} of ${t.topic} questions, and accuracy is ${fmtPct(t.accuracy)} when attempted. Current selection appears consistent with your recorded results.`,
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
          text: `You have marked ${t.strategicSkipCount} ${t.topic} questions as strategic skips, while recording ${fmtPct(t.accuracy)} accuracy when attempting the topic. Some of these skips may be costing marks.`,
          recommendation: `Review ${t.topic} before applying a strategic skip; your recorded accuracy supports attempting it more often.`,
        });
      } else if (t.accuracy < 0.4) {
        insights.push({
          id: `topic-decision-good-${t.section}-${t.topic}`,
          section: t.section,
          tone: "positive",
          significance: 1 - t.accuracy,
          title: "Skip strategy validated",
          text: `Your strategic skips on ${t.topic} align with the ${fmtPct(t.accuracy)} accuracy recorded when you attempt it.`,
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
            recommendation: delta < 0 ? `Schedule a focused review of ${t.topic} and use the next few mocks to check whether accuracy stabilises.` : null,
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
          text: `${t.topic} accuracy varies by ±${fmtNum(sd * 100, 0)}% across mocks. The result is not yet stable enough to describe as a consistent strength or gap.`,
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
  const topicAccuracyMap = new Map(topicRecords.map((t) => [
    topicLookupKey(t.section, t.topicId, t.topic),
    t.accuracy,
  ]));

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
