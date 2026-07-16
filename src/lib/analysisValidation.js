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

export function validateAnalysisAgainstMock(mock, analysis) {
  const errors = [];
  if (!mock || !analysis) return ["Choose a mock and complete its analysis first."];

  SECTIONS.forEach((section) => {
    const loggedSection = mock[section] || mock.sections?.[section];
    const sectionAnalysis = analysis.sections?.[section];
    if (!loggedSection || !sectionAnalysis) return;

    const questions = questionsForSection(analysis, section);
    const loggedQuestionCount = Number(loggedSection.totalQuestions || 0);
    if (loggedQuestionCount > 0 && questions.length !== loggedQuestionCount) {
      errors.push(`${section}: analysis has ${questions.length} questions, but the mock log says ${loggedQuestionCount}.`);
    }

    const loggedScore = loggedSection.manualTotalMarks ?? loggedSection.totalMarks;
    if (loggedScore !== null && loggedScore !== undefined && loggedScore !== "") {
      const analysisScore = sectionAnalysisScore(analysis, section);
      if (Math.abs(analysisScore - Number(loggedScore)) > 0.001) {
        errors.push(`${section}: analysis score is ${fmtNum(analysisScore, 0)}, but the mock log score is ${fmtNum(loggedScore, 0)}.`);
      }
    }
  });

  return errors;
}
