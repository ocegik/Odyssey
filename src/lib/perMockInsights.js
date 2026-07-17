import { SECTIONS } from "../constants";
import { fmtNum, fmtPct } from "./format";
import { mockTotalMarks, computeAdaptiveTarget } from "./compute";
import { inc, topEntry } from "./aggregate";

function analysisQuestions(mock) {
  if (!mock?.analysis?.sections) return [];
  return SECTIONS.flatMap((section) => {
    const sectionAnalysis = mock.analysis.sections[section];
    if (!sectionAnalysis?.blocks) return [];
    return sectionAnalysis.blocks.flatMap((block) =>
      (block.questions || []).map((question) => ({ ...question, section }))
    );
  });
}

export function buildPerMockInsights(mock, settings = {}, priorMarks = null) {
  if (!mock) return [];

  const questions = analysisQuestions(mock);
  const wrongReasons = {};
  const skippedReasons = {};
  const sectionWrong = {};
  const sectionSkipped = {};
  let wrong = 0;
  let skipped = 0;

  questions.forEach((question) => {
    if (question.result === "Wrong") {
      wrong += 1;
      inc(wrongReasons, question.outcomeReason);
      inc(sectionWrong, question.section);
    }
    if (question.result === "Skipped") {
      skipped += 1;
      inc(skippedReasons, question.outcomeReason);
      inc(sectionSkipped, question.section);
    }
  });

  const insights = [];
  const topWrong = topEntry(wrongReasons);
  const topSkipped = topEntry(skippedReasons);
  const topWrongSection = topEntry(sectionWrong);
  const topSkippedSection = topEntry(sectionSkipped);

  if (topWrong && wrong > 0) {
    insights.push({
      id: "top-wrong",
      label: "Biggest mistake category",
      value: topWrong.label,
      tone: "negative",
      sub: `${topWrong.count}/${wrong} wrong questions (${fmtPct(topWrong.count / wrong)})${topWrongSection ? `, led by ${topWrongSection.label}` : ""}.`,
    });
  }

  if (topSkipped && skipped > 0) {
    insights.push({
      id: "top-skip",
      label: "Skip pattern",
      value: topSkipped.label,
      tone: "negative",
      sub: `${topSkipped.count}/${skipped} skipped questions (${fmtPct(topSkipped.count / skipped)})${topSkippedSection ? `, led by ${topSkippedSection.label}` : ""}.`,
    });
  }

  const targetMarks = computeAdaptiveTarget(priorMarks, settings?.overallTargetMarks);
  if (targetMarks !== null && targetMarks !== undefined) {
    const totalMarks = mockTotalMarks(mock);
    const delta = totalMarks - targetMarks;
    insights.push({
      id: "target-score",
      label: "Target score comparison",
      value: delta >= 0 ? `+${fmtNum(delta, 0)}` : fmtNum(delta, 0),
      tone: delta >= 0 ? "positive" : "negative",
      sub: `${fmtNum(totalMarks, 0)} scored vs ${fmtNum(targetMarks, 0)} adaptive target marks.`,
    });
  }

  if (questions.length > 0 && insights.length === 0) {
    insights.push({
      id: "analysis-captured",
      label: "Mock analysis",
      value: `${questions.length} questions`,
      tone: "neutral",
      sub: "Detailed data is attached for this mock.",
    });
  }

  return insights.slice(0, 3);
}
