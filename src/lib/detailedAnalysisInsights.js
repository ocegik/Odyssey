import { SECTIONS } from "../constants";
import { fmtNum, fmtPct } from "./format";
import { getEffectiveTopic } from "./analysisModel";

const MIN_RECURRING_REASON_COUNT = 3;
const MIN_RECURRING_MOCK_COUNT = 2;
const SLOW_DELTA_SECONDS = 15;
const MIN_TOPIC_ATTEMPTS = 3;
const WEAKEST_TOPIC_MAX_ACCURACY = 0.6;

function inc(counter, key, by = 1) {
  const safeKey = key || "Unspecified";
  counter[safeKey] = (counter[safeKey] || 0) + by;
}

function topEntry(counter) {
  const entries = Object.entries(counter || {}).sort((a, b) => b[1] - a[1]);
  return entries[0] ? { label: entries[0][0], count: entries[0][1] } : null;
}

function topEntries(counter, limit = 4) {
  return Object.entries(counter || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function avg(total, count) {
  return count > 0 ? total / count : null;
}

function mockLabel(mock) {
  return `${mock.date} - ${mock.source}`;
}

export function flattenAnalysisQuestions(mocks) {
  return mocks.flatMap((mock) => {
    if (!mock.analysis?.sections) return [];
    return SECTIONS.flatMap((section) => {
      const sectionAnalysis = mock.analysis.sections[section];
      if (!sectionAnalysis?.blocks) return [];
      return sectionAnalysis.blocks.flatMap((block) =>
        (block.questions || []).map((question) => ({
          ...question,
          mockId: mock.id,
          mockDate: mock.date,
          mockSource: mock.source,
          mockLabel: mockLabel(mock),
          section,
          blockId: block.id,
          blockType: block.type,
          blockName: block.name,
          topic: getEffectiveTopic(block, question),
          attempted: question.result !== "Skipped",
          timeDelta: question.timeTaken !== null && question.averageTime !== null ? question.timeTaken - question.averageTime : null,
          slow: question.timeTaken !== null && question.averageTime !== null ? question.timeTaken > question.averageTime + SLOW_DELTA_SECONDS : false,
        }))
      );
    });
  });
}

function emptySectionSummary(section) {
  return {
    section,
    total: 0,
    attempted: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    slow: 0,
    totalTime: 0,
    timed: 0,
    accuracy: null,
    avgTime: null,
    slowRate: null,
    wrongReasons: {},
    skippedReasons: {},
    correctReasons: {},
    questionTypes: {},
    wrongByType: {},
    attemptedByType: {},
    topicStats: {},
  };
}

function topicStat(summary, topic) {
  return summary.topicStats[topic] || (summary.topicStats[topic] = { attempted: 0, correct: 0 });
}

function summarizeSection(section, questions) {
  const summary = emptySectionSummary(section);
  questions.forEach((question) => {
    summary.total += 1;
    if (question.attempted) summary.attempted += 1;
    if (question.result === "Correct") summary.correct += 1;
    if (question.result === "Wrong") summary.wrong += 1;
    if (question.result === "Skipped") summary.skipped += 1;
    if (question.slow) summary.slow += 1;
    if (question.timeTaken !== null) {
      summary.totalTime += question.timeTaken;
      summary.timed += 1;
    }

    inc(summary.questionTypes, question.questionType);
    if (question.attempted) inc(summary.attemptedByType, question.questionType);
    if (question.result === "Wrong") inc(summary.wrongByType, question.questionType);
    if (question.result === "Wrong") inc(summary.wrongReasons, question.outcomeReason);
    if (question.result === "Skipped") inc(summary.skippedReasons, question.outcomeReason);
    if (question.result === "Correct") inc(summary.correctReasons, question.outcomeReason);

    if (question.topic) {
      const stat = topicStat(summary, question.topic);
      if (question.attempted) stat.attempted += 1;
      if (question.result === "Correct") stat.correct += 1;
    }
  });

  summary.accuracy = summary.attempted > 0 ? summary.correct / summary.attempted : null;
  summary.avgTime = avg(summary.totalTime, summary.timed);
  summary.slowRate = summary.total > 0 ? summary.slow / summary.total : null;
  return summary;
}

function buildSectionSummaries(questions) {
  return SECTIONS.reduce((acc, section) => {
    acc[section] = summarizeSection(section, questions.filter((question) => question.section === section));
    return acc;
  }, {});
}

function reasonMockSpread(questions, section, result, reason) {
  return new Set(
    questions
      .filter((question) => question.section === section && question.result === result && (question.outcomeReason || "Unspecified") === reason)
      .map((question) => question.mockId)
  ).size;
}

function generateSectionInsights(sectionSummaries, questions) {
  const insights = [];

  SECTIONS.forEach((section) => {
    const summary = sectionSummaries[section];
    if (!summary || summary.total === 0) return;

    const topWrong = topEntry(summary.wrongReasons);
    if (topWrong && summary.wrong > 0) {
      const share = topWrong.count / summary.wrong;
      insights.push({
        id: `${section}-wrong-reason-${topWrong.label}`,
        section,
        tone: "negative",
        significance: share,
        title: "Wrong-answer driver",
        text: `${section} wrong answers are mostly from ${topWrong.label}: ${topWrong.count}/${summary.wrong} wrong questions (${fmtPct(share)}).`,
      });
    }

    const topSkipped = topEntry(summary.skippedReasons);
    if (topSkipped && summary.skipped > 0) {
      const share = topSkipped.count / summary.skipped;
      insights.push({
        id: `${section}-skip-reason-${topSkipped.label}`,
        section,
        tone: "negative",
        significance: Math.min(1, share * 0.9),
        title: "Skip pattern",
        text: `${section} skips are mainly ${topSkipped.label}: ${topSkipped.count}/${summary.skipped} skipped questions (${fmtPct(share)}).`,
      });
    }

    const topType = topEntry(summary.wrongByType);
    if (topType && summary.attemptedByType[topType.label] >= 2) {
      const typeWrongRate = topType.count / summary.attemptedByType[topType.label];
      if (typeWrongRate >= 0.35) {
        insights.push({
          id: `${section}-type-risk-${topType.label}`,
          section,
          tone: "negative",
          significance: typeWrongRate,
          title: "Question-type risk",
          text: `${section} ${topType.label} attempts are leaking accuracy: ${topType.count}/${summary.attemptedByType[topType.label]} attempted ${topType.label} questions were wrong (${fmtPct(typeWrongRate)} wrong-rate).`,
        });
      }
    }

    if (summary.slowRate !== null && summary.slowRate >= 0.35) {
      insights.push({
        id: `${section}-slow-rate`,
        section,
        tone: "negative",
        significance: summary.slowRate,
        title: "Time pressure",
        text: `${section} has ${summary.slow} slow questions out of ${summary.total} (${fmtPct(summary.slowRate)}), so timing is likely part of the pattern, not just accuracy.`,
      });
    }

    const topicEntries = Object.entries(summary.topicStats)
      .map(([topic, stat]) => ({ topic, ...stat, accuracy: stat.attempted > 0 ? stat.correct / stat.attempted : null }))
      .filter((entry) => entry.attempted >= MIN_TOPIC_ATTEMPTS && entry.accuracy !== null);
    if (topicEntries.length > 0) {
      const weakestTopic = [...topicEntries].sort((a, b) => a.accuracy - b.accuracy)[0];
      if (weakestTopic.accuracy <= WEAKEST_TOPIC_MAX_ACCURACY) {
        insights.push({
          id: `${section}-weakest-topic-${weakestTopic.topic}`,
          section,
          tone: "negative",
          significance: 1 - weakestTopic.accuracy,
          title: "Weakest topic",
          text: `${section}'s softest topic is ${weakestTopic.topic}: ${weakestTopic.correct}/${weakestTopic.attempted} correct (${fmtPct(weakestTopic.accuracy)}).`,
        });
      }
    }

    const repeatedWrong = topWrong ? reasonMockSpread(questions, section, "Wrong", topWrong.label) : 0;
    if (topWrong && topWrong.count >= MIN_RECURRING_REASON_COUNT && repeatedWrong >= MIN_RECURRING_MOCK_COUNT) {
      insights.push({
        id: `${section}-recurring-${topWrong.label}`,
        section,
        tone: "negative",
        significance: Math.min(1, topWrong.count / Math.max(1, summary.total)),
        title: "Recurring mistake",
        text: `${topWrong.label} is recurring in ${section}: ${topWrong.count} wrong questions across ${repeatedWrong} analyzed mocks.`,
      });
    }
  });

  return insights.sort((a, b) => b.significance - a.significance).slice(0, 8);
}

function buildReasonRows(sectionSummaries) {
  return SECTIONS.map((section) => {
    const summary = sectionSummaries[section];
    const topWrong = topEntry(summary.wrongReasons);
    const topSkipped = topEntry(summary.skippedReasons);
    const topCorrect = topEntry(summary.correctReasons);
    return {
      section,
      total: summary.total,
      accuracy: summary.accuracy,
      correct: summary.correct,
      wrong: summary.wrong,
      skipped: summary.skipped,
      slowRate: summary.slowRate,
      avgTime: summary.avgTime,
      topWrong,
      topSkipped,
      topCorrect,
      wrongReasons: topEntries(summary.wrongReasons),
      skippedReasons: topEntries(summary.skippedReasons),
    };
  });
}

function buildTopicRows(sectionSummaries) {
  return SECTIONS.flatMap((section) => {
    const summary = sectionSummaries[section];
    return Object.entries(summary.topicStats)
      .map(([topic, stat]) => ({
        section,
        topic,
        attempted: stat.attempted,
        correct: stat.correct,
        accuracy: stat.attempted > 0 ? stat.correct / stat.attempted : null,
      }))
      .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1));
  });
}

function buildTimingRows(questions) {
  return SECTIONS.map((section) => {
    const sectionQuestions = questions.filter((question) => question.section === section);
    const byResult = ["Correct", "Wrong", "Skipped"].reduce((acc, result) => {
      const matching = sectionQuestions.filter((question) => question.result === result && question.timeTaken !== null);
      acc[result] = {
        count: matching.length,
        avgTime: avg(matching.reduce((sum, question) => sum + question.timeTaken, 0), matching.length),
        avgDelta: avg(matching.reduce((sum, question) => sum + (question.timeDelta || 0), 0), matching.filter((question) => question.timeDelta !== null).length),
      };
      return acc;
    }, {});
    return { section, byResult };
  });
}

function buildMockTrendRows(mocks) {
  return mocks
    .filter((mock) => mock.analysis?.summary)
    .map((mock) => ({
      label: mockLabel(mock),
      date: mock.date,
      source: mock.source,
      totalQuestions: mock.analysis.summary.totalQuestions,
      accuracy: mock.analysis.summary.accuracy,
      wrong: mock.analysis.summary.wrong,
      skipped: mock.analysis.summary.skipped,
      slowQuestions: mock.analysis.summary.slowQuestions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDetailedAnalysisInsights(mocks) {
  const analyzedMocks = mocks.filter((mock) => mock.analysis);
  const questions = flattenAnalysisQuestions(mocks);
  const sectionSummaries = buildSectionSummaries(questions);
  const insights = generateSectionInsights(sectionSummaries, questions);

  return {
    analyzedMockCount: analyzedMocks.length,
    questionCount: questions.length,
    attempted: questions.filter((question) => question.attempted).length,
    wrong: questions.filter((question) => question.result === "Wrong").length,
    skipped: questions.filter((question) => question.result === "Skipped").length,
    accuracy: (() => {
      const attempted = questions.filter((question) => question.attempted).length;
      const correct = questions.filter((question) => question.result === "Correct").length;
      return attempted > 0 ? correct / attempted : null;
    })(),
    sectionSummaries,
    reasonRows: buildReasonRows(sectionSummaries),
    timingRows: buildTimingRows(questions),
    mockTrendRows: buildMockTrendRows(mocks),
    topicRows: buildTopicRows(sectionSummaries),
    insights,
  };
}
