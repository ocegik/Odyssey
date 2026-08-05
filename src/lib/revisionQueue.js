import { flattenAnalysisQuestions } from "./detailedAnalysisInsights";
import { getTopicNode } from "./topicRegistry";

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function revisionReason(question) {
  if (question.result === "Wrong" && question.outcomeReason === "Concept Error") return "concept-error";
  if (question.result === "Skipped" && /didn't know concept|couldn't crack the set/i.test(question.outcomeReason || "")) return "knowledge-gap-skip";
  return null;
}

function latestEventByQuestion(revisionEvents) {
  return (revisionEvents || []).reduce((out, event) => {
    if (event?.sourceQuestionId) out[event.sourceQuestionId] = event;
    return out;
  }, {});
}

/**
 * Builds actionable revision candidates from canonical analysis evidence.
 * Completion/dismissal is read from revision events; the candidate itself is
 * never stored as a mutable counter and therefore stays correct when a mock
 * is edited or removed.
 */
export function buildRevisionQueue(mocks, revisionEvents = []) {
  const latestEvents = latestEventByQuestion(revisionEvents);
  return flattenAnalysisQuestions(mocks)
    .map((question) => {
      const reason = revisionReason(question);
      const topic = getTopicNode(question.topicId);
      if (!reason || !topic) return null;
      const sourceQuestionId = `${question.mockId}:${question.id}`;
      const event = latestEvents[sourceQuestionId];
      if (event?.action === "completed" || event?.action === "dismissed") return null;
      return {
        id: `revision:${sourceQuestionId}`,
        sourceQuestionId,
        mockId: question.mockId,
        mockDate: question.mockDate,
        questionNumber: question.questionNumber,
        topicId: topic.id,
        topic: topic.name,
        reason,
        severity: reason === "concept-error" ? 3 : 2,
        dueDate: event?.dueDate || addDays(question.mockDate, event?.action === "deferred" ? 3 : 1),
        status: event?.action || "queued",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.severity - a.severity || String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
}
