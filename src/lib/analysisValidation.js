import { SECTIONS } from "../constants";
import { fmtNum } from "./format";

export function questionScore(question) {
  if (question.result === "Correct") return 3;
  if (question.result === "Wrong" && question.questionType !== "TITA") return -1;
  return 0;
}

function questionsForSection(analysis, section) {
  return (analysis?.sections?.[section]?.blocks || []).flatMap((block) => block.questions || []);
}

export function sectionAnalysisScore(analysis, section) {
  return questionsForSection(analysis, section).reduce((sum, question) => sum + questionScore(question), 0);
}

/**
 * Cross-checks a draft analysis against the mock's logged data, but never
 * blocks saving — an analysis is allowed to be partial (some questions still
 * "Unreviewed") indefinitely, since that's the whole point of letting
 * detailed review happen progressively instead of in one sitting.
 *
 * Returned notices are informational: structure mismatches always surface,
 * an in-progress section gets a neutral progress note instead of a score
 * check (comparing scores before every question is reviewed would just be
 * noise), and a real score mismatch only surfaces once nothing is left
 * "Unreviewed" — at that point it's a genuine signal (likely a misclassified
 * question) worth a nudge, not a blocker.
 */
export function reviewAnalysisAgainstMock(mock, analysis) {
  const notices = [];
  if (!mock || !analysis) return notices;

  SECTIONS.forEach((section) => {
    const loggedSection = mock[section] || mock.sections?.[section];
    const sectionAnalysis = analysis.sections?.[section];
    if (!loggedSection || !sectionAnalysis) return;

    const questions = questionsForSection(analysis, section);
    const loggedQuestionCount = Number(loggedSection.totalQuestions || 0);
    if (loggedQuestionCount > 0 && questions.length !== loggedQuestionCount) {
      notices.push({
        section,
        tone: "info",
        text: `${section}: analysis structure has ${questions.length} questions, but the mock log says ${loggedQuestionCount}.`,
      });
    }

    const unreviewedCount = questions.filter((q) => q.result === "Unreviewed").length;
    if (unreviewedCount > 0) {
      notices.push({
        section,
        tone: "progress",
        text: `${section}: ${questions.length - unreviewedCount}/${questions.length} questions reviewed so far — the rest will save as-is, and the score check runs once they're filled in.`,
      });
      return;
    }

    const loggedScore = loggedSection.manualTotalMarks ?? loggedSection.totalMarks;
    if (loggedScore !== null && loggedScore !== undefined && loggedScore !== "") {
      const analysisScore = sectionAnalysisScore(analysis, section);
      if (Math.abs(analysisScore - Number(loggedScore)) > 0.001) {
        notices.push({
          section,
          tone: "warn",
          text: `${section}: fully reviewed, but the analysis score (${fmtNum(analysisScore, 0)}) doesn't match the mock log score (${fmtNum(loggedScore, 0)}) — worth double-checking a question's result.`,
        });
      }
    }
  });

  return notices;
}
