import { SECTIONS } from "../constants";
import { uid } from "./format";
import { accuracyOf } from "./aggregate";

export const ANALYSIS_SCHEMA_VERSION = 1;

const RESULT_VALUES = ["Correct", "Wrong", "Skipped"];
const QUESTION_TYPES = ["MCQ", "TITA"];
/**
 * Outcome reasons are tailored per section (max 5 per section/result pair) so
 * they reflect how mistakes actually happen there, rather than one shared
 * Quant-leaning list. Reasons that legitimately apply everywhere (e.g. "Time
 * Pressure", "Strategic Skip") intentionally repeat with identical strings
 * across sections — this keeps cross-section aggregation and the hardcoded
 * "Concept Error" / "Strategic Skip" / guess-reason checks in
 * advancedInsights.js working unchanged.
 */
export const OUTCOME_REASONS = {
  VARC: {
    Correct: ["Strong Passage Understanding", "Logical Elimination", "Confirmed via Re-reading", "Intelligent Guess", "Lucky Guess"],
    Wrong: ["Guessed Between Close Options", "Misread Tone/Inference", "Trap Option", "Vocabulary Gap", "Time Pressure"],
    Skipped: ["Passage Too Dense/Confusing", "Couldn't Narrow Down Options", "Strategic Skip", "Ran Out of Time", "Lost Focus Mid-Passage"],
  },
  DILR: {
    Correct: ["Correct Set Approach", "Logical Elimination", "Intelligent Guess", "Good Time Management", "Lucky Guess"],
    Wrong: ["Concept Error", "Misread Data/Chart", "Calculation Error", "Trap Option", "Time Pressure"],
    Skipped: ["Couldn't Crack the Set", "Set Too Time-Consuming", "Strategic Skip", "Ran Out of Time", "Misjudged Set Difficulty"],
  },
  Quant: {
    Correct: ["Strong Understanding", "Logical Elimination", "Intelligent Guess", "Good Time Management", "Lucky Guess"],
    Wrong: ["Concept Error", "Calculation Error", "Misread Question", "Trap Option", "Time Pressure"],
    Skipped: ["Didn't Know Concept", "Couldn't Find Approach", "Too Time Consuming", "Strategic Skip", "Ran Out of Time"],
  },
};
export const TOPIC_OPTIONS = {
  Quant: ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Modern Math"],
  DILR: ["Data Interpretation", "Data Sufficiency", "Puzzles & Arrangements", "Sets & Venn Diagrams", "Reasoning"],
  VARC: ["Reading Comprehension", "Verbal Ability"],
};

const analysisId = () => uid().replace(/^e_/, "a_");
const blockId = () => uid().replace(/^e_/, "b_");
const questionId = () => uid().replace(/^e_/, "q_");

function asString(value) {
  return value === undefined || value === null ? "" : String(value);
}

function asNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeAnalysisSectionName(section) {
  const raw = asString(section).trim();
  if (raw.toUpperCase() === "QA") return "Quant";
  return SECTIONS.find((s) => s.toUpperCase() === raw.toUpperCase()) || null;
}

function normalizeResult(value) {
  const str = asString(value).trim();
  return RESULT_VALUES.find((result) => result.toUpperCase() === str.toUpperCase()) || "Skipped";
}

function normalizeQuestionType(value) {
  const str = asString(value).trim();
  return QUESTION_TYPES.find((type) => type.toUpperCase() === str.toUpperCase()) || str || "MCQ";
}

function normalizeTopic(section, value) {
  const options = TOPIC_OPTIONS[section] || [];
  const str = asString(value).trim();
  return options.find((topic) => topic.toLowerCase() === str.toLowerCase()) || "";
}

/**
 * The topic that actually applies to a question: a set assigns its topic
 * once at the block level and every question in it inherits that, while an
 * independent question keeps its own topic. Falls back to the question's own
 * topic for older saved sets from before topics lived on the block, so
 * existing tagged data isn't silently dropped.
 */
export function getEffectiveTopic(block, question) {
  if (!block) return question?.topic || "";
  if (block.type === "set") return block.topic || question?.topic || "";
  return question?.topic || "";
}

function normalizeQuestion(rawQuestion, idx, section) {
  const result = normalizeResult(rawQuestion.result);
  const reason = asString(rawQuestion.outcomeReason).trim();
  const allowedReasons = OUTCOME_REASONS[section]?.[result] || [];
  return {
    id: rawQuestion.id || questionId(),
    questionNumber: Number(rawQuestion.questionNumber || idx + 1),
    result,
    outcomeReason: allowedReasons.includes(reason) ? reason : allowedReasons[0] || "",
    questionType: normalizeQuestionType(rawQuestion.questionType),
    topic: normalizeTopic(section, rawQuestion.topic),
    timeTaken: asNumberOrNull(rawQuestion.timeTaken),
    averageTime: asNumberOrNull(rawQuestion.averageTime),
    notes: asString(rawQuestion.notes),
  };
}

function normalizeBlock(rawBlock, idx, section) {
  const questions = Array.isArray(rawBlock.questions) ? rawBlock.questions : [];
  const type = asString(rawBlock.type) || "independent";
  return {
    id: rawBlock.id || blockId(),
    type,
    name: asString(rawBlock.name),
    topic: type === "set" ? normalizeTopic(section, rawBlock.topic) : "",
    questions: questions.map((question, questionIdx) => normalizeQuestion(question, questionIdx, section)),
  };
}

function normalizeSection(rawSection, sectionName) {
  const blocks = Array.isArray(rawSection.blocks) ? rawSection.blocks : [];
  return {
    section: sectionName,
    id: rawSection.id || uid(),
    createdAt: rawSection.createdAt || Date.now(),
    percentile: asNumberOrNull(rawSection.percentile),
    topperScore: asNumberOrNull(rawSection.topperScore),
    notes: asString(rawSection.notes),
    blocks: blocks.map((block, blockIdx) => normalizeBlock(block, blockIdx, sectionName)),
  };
}

function incrementCounter(counter, key) {
  const safeKey = key || "Unspecified";
  counter[safeKey] = (counter[safeKey] || 0) + 1;
}

function summarizeQuestions(questions) {
  const summary = {
    totalQuestions: questions.length,
    attempted: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    totalTime: 0,
    totalAverageTime: 0,
    timedQuestions: 0,
    slowQuestions: 0,
    accuracy: null,
    averageTime: null,
    averageBenchmarkTime: null,
    timeDelta: null,
    resultCounts: {},
    reasonCounts: {},
    questionTypeCounts: {},
  };

  questions.forEach((question) => {
    if (question.result === "Correct") {
      summary.correct += 1;
      summary.attempted += 1;
    } else if (question.result === "Wrong") {
      summary.wrong += 1;
      summary.attempted += 1;
    } else {
      summary.skipped += 1;
    }

    incrementCounter(summary.resultCounts, question.result);
    incrementCounter(summary.reasonCounts, question.outcomeReason);
    incrementCounter(summary.questionTypeCounts, question.questionType);

    if (question.timeTaken !== null) {
      summary.totalTime += question.timeTaken;
      summary.timedQuestions += 1;
    }
    if (question.averageTime !== null) summary.totalAverageTime += question.averageTime;
    if (question.timeTaken !== null && question.averageTime !== null && question.timeTaken > question.averageTime) {
      summary.slowQuestions += 1;
    }
  });

  summary.accuracy = accuracyOf(summary.correct, summary.attempted);
  summary.averageTime = summary.timedQuestions > 0 ? summary.totalTime / summary.timedQuestions : null;
  summary.averageBenchmarkTime = summary.timedQuestions > 0 ? summary.totalAverageTime / summary.timedQuestions : null;
  summary.timeDelta = summary.timedQuestions > 0 ? summary.totalTime - summary.totalAverageTime : null;
  return summary;
}

export function buildAnalysisSummary(sections) {
  const sectionSummaries = {};
  const allQuestions = [];

  SECTIONS.forEach((sectionName) => {
    const section = sections[sectionName];
    if (!section) return;
    const questions = section.blocks.flatMap((block) => block.questions);
    sectionSummaries[sectionName] = summarizeQuestions(questions);
    allQuestions.push(...questions);
  });

  return {
    ...summarizeQuestions(allQuestions),
    sections: sectionSummaries,
  };
}

export function normalizeDetailedAnalysis(rawAnalysis, existing = null) {
  if (!rawAnalysis || typeof rawAnalysis !== "object") {
    throw new Error("Analysis file must contain a JSON object.");
  }

  const rawSections = rawAnalysis.sections || {};
  const sections = {};

  Object.entries(rawSections).forEach(([rawSectionName, rawSection]) => {
    const sectionName = normalizeAnalysisSectionName(rawSection.section || rawSectionName);
    if (!sectionName) throw new Error(`Analysis contains an unknown section: "${rawSectionName}".`);
    sections[sectionName] = normalizeSection(rawSection, sectionName);
  });

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    id: existing?.id || rawAnalysis.id || analysisId(),
    createdAt: existing?.createdAt || rawAnalysis.createdAt || Date.now(),
    updatedAt: existing ? Date.now() : rawAnalysis.updatedAt || Date.now(),
    sourceFormat: rawAnalysis.sourceFormat || "detailed-analysis-json",
    mockName: asString(rawAnalysis.mockName),
    date: asString(rawAnalysis.date),
    overallReflection: asString(rawAnalysis.overallReflection),
    overallPercentile: asNumberOrNull(rawAnalysis.overallPercentile),
    overallTopperScore: asNumberOrNull(rawAnalysis.overallTopperScore),
    structureText: asString(rawAnalysis.structureText),
    insightDimensions: [
      "recurringMistakes",
      "accuracyPatterns",
      "timeManagement",
      "outcomeReasonPatterns",
      "sectionSpecificTrends",
      "longTermComparisons",
    ],
    sections,
    summary: buildAnalysisSummary(sections),
  };
}

function sampleQuestion(section, questionNumber, idx) {
  const resultCycle = ["Wrong", "Skipped", "Correct", "Correct", "Wrong", "Correct", "Skipped"];
  const result = resultCycle[(idx + section.length) % resultCycle.length];
  const reasons = OUTCOME_REASONS[section]?.[result] || [];
  const averageTime = section === "VARC" ? 60 : section === "DILR" ? 150 : 120;
  const timeTaken = Math.max(25, averageTime + ((idx % 5) - 2) * 18 + (result === "Wrong" ? 22 : 0));
  const topics = TOPIC_OPTIONS[section] || [];
  return {
    questionNumber,
    result,
    outcomeReason: reasons[idx % reasons.length],
    questionType: idx % 5 === 4 ? "TITA" : "MCQ",
    topic: topics.length ? topics[idx % topics.length] : "",
    timeTaken,
    averageTime,
    notes: "",
  };
}

function sampleBlocksForSection(section, totalQuestions) {
  const count = Math.max(1, Number(totalQuestions) || (section === "VARC" ? 24 : 22));
  if (section === "Quant") {
    return [{
      type: "independent",
      name: "Questions",
      questions: Array.from({ length: count }, (_, idx) => sampleQuestion(section, idx + 1, idx)),
    }];
  }

  const blockSize = section === "VARC" ? 5 : 4;
  const topics = TOPIC_OPTIONS[section] || [];
  const blocks = [];
  for (let start = 1; start <= count; start += blockSize) {
    const end = Math.min(count, start + blockSize - 1);
    blocks.push({
      type: "set",
      name: `Set ${blocks.length + 1}`,
      topic: topics.length ? topics[blocks.length % topics.length] : "",
      questions: Array.from({ length: end - start + 1 }, (_, idx) => sampleQuestion(section, start + idx, start + idx - 1)),
    });
  }
  return blocks;
}

export function makeSampleDetailedAnalysis(mock) {
  const sections = {};
  SECTIONS.forEach((sectionName) => {
    const scoreSection = mock.sections?.[sectionName] || mock[sectionName];
    if (!scoreSection) return;
    sections[sectionName] = {
      percentile: scoreSection.percentile ?? null,
      topperScore: scoreSection.topperScore ?? null,
      notes: `Sample ${sectionName} analysis for testing. Replace or delete this before using real data.`,
      blocks: sampleBlocksForSection(sectionName, scoreSection.totalQuestions),
    };
  });

  return {
    mockName: `${mock.source} sample analysis`,
    date: mock.date,
    overallReflection: "Sample analysis loaded for testing detailed insights. This is synthetic data, not a real mock review.",
    overallPercentile: null,
    overallTopperScore: null,
    structureText: SECTIONS.filter((section) => sections[section]).map((section) => `${section}\nSample structure`).join("\n\n"),
    sections,
  };
}
