import { flattenAnalysisQuestions } from "./detailedAnalysisInsights";
import { getTopicAncestors, getTopicNode } from "./topicRegistry";

function emptyMetric(topicId) {
  return {
    topicId,
    total: 0,
    directTotal: 0,
    attempted: 0,
    directAttempted: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    unreviewed: 0,
    marks: 0,
    timed: 0,
    totalTime: 0,
    conceptErrors: 0,
    lastAttemptDate: null,
    loggedQuestions: [],
  };
}

function marksForQuestion(question) {
  if (question.result === "Correct") return 3;
  if (question.result === "Wrong" && question.questionType === "MCQ") return -1;
  return 0;
}

function finalizeMetric(metric) {
  return {
    ...metric,
    accuracy: metric.attempted > 0 ? metric.correct / metric.attempted : null,
    averageTime: metric.timed > 0 ? metric.totalTime / metric.timed : null,
    weak: metric.attempted >= 3 && metric.correct / metric.attempted < 0.6,
  };
}

/**
 * Derives syllabus evidence from canonical analysis references. A question is
 * counted once at its assigned node and once in each ancestor rollup; it is
 * never copied into sibling leaves.
 */
export function buildTopicMetrics(mocks) {
  const byTopicId = {};
  const questions = flattenAnalysisQuestions(mocks);

  questions.forEach((question) => {
    const assignedNodes = [...new Map(
      (question.topicRefs?.length ? question.topicRefs : [{ topicId: question.topicId }])
        .map((ref) => getTopicNode(ref?.topicId))
        .filter(Boolean)
        .map((node) => [node.id, node])
    ).values()];
    if (assignedNodes.length === 0) return;

    // A question can now carry both a set topic and a semantic question type.
    // Count it once at shared ancestors (e.g. Reading Comprehension), while
    // retaining one direct record at each explicitly selected leaf.
    const directIds = new Set(assignedNodes.map((node) => node.id));
    const rollupNodes = [...new Map(
      assignedNodes.flatMap((assigned) => [assigned, ...getTopicAncestors(assigned.id)])
        .map((node) => [node.id, node])
    ).values()];
    rollupNodes.forEach((node) => {
      const metric = byTopicId[node.id] || (byTopicId[node.id] = emptyMetric(node.id));
      const isDirect = directIds.has(node.id);
      metric.total += 1;
      if (isDirect) metric.directTotal += 1;
      if (question.attempted) {
        metric.attempted += 1;
        if (isDirect) metric.directAttempted += 1;
      }
      if (question.result === "Correct") metric.correct += 1;
      if (question.result === "Wrong") metric.wrong += 1;
      if (question.result === "Skipped") metric.skipped += 1;
      if (question.result === "Unreviewed") metric.unreviewed += 1;
      metric.marks += marksForQuestion(question);
      if (question.outcomeReason === "Concept Error") metric.conceptErrors += 1;
      if (question.timeTaken !== null) {
        metric.timed += 1;
        metric.totalTime += question.timeTaken;
      }
      if (question.attempted && (!metric.lastAttemptDate || question.mockDate > metric.lastAttemptDate)) {
        metric.lastAttemptDate = question.mockDate;
      }
      metric.loggedQuestions.push({
        mockId: question.mockId,
        mockDate: question.mockDate,
        mockSource: question.mockSource,
        section: question.section,
        questionNumber: question.questionNumber,
      });
    });
  });

  Object.keys(byTopicId).forEach((topicId) => {
    byTopicId[topicId] = finalizeMetric(byTopicId[topicId]);
  });

  const analyzedQuestions = questions.filter((question) => question.topicRefs?.length || question.topicId);
  return {
    byTopicId,
    summary: {
      total: analyzedQuestions.length,
      attempted: analyzedQuestions.filter((question) => question.attempted).length,
      topicsWithEvidence: Object.keys(byTopicId).length,
    },
  };
}
