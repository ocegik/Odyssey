import { SECTIONS } from "../constants";
import { uid } from "./format";
import { accuracyOf } from "./aggregate";

export const ANALYSIS_SCHEMA_VERSION = 2;

/**
 * "Unreviewed" is distinct from "Skipped": it's the default for a question
 * nobody has looked at yet, so it can be excluded from score reconciliation
 * and every other stat — a real "Skipped" is an actual exam outcome (worth
 * 0 marks, same as Unreviewed, but a deliberate one worth counting in skip
 * patterns). This split is what lets an analysis be saved half-finished.
 */
const RESULT_VALUES = ["Correct", "Wrong", "Skipped", "Unreviewed"];
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
  return RESULT_VALUES.find((result) => result.toUpperCase() === str.toUpperCase()) || "Unreviewed";
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
    unreviewed: 0,
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
    } else if (question.result === "Skipped") {
      summary.skipped += 1;
    } else {
      summary.unreviewed += 1;
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

  const analysisPayload = rawAnalysis.analysis && typeof rawAnalysis.analysis === "object"
    ? rawAnalysis.analysis
    : rawAnalysis;
  const rawSections = analysisPayload.sections || {};
  const sections = {};

  Object.entries(rawSections).forEach(([rawSectionName, rawSection]) => {
    const sectionName = normalizeAnalysisSectionName(rawSection.section || rawSectionName);
    if (!sectionName) throw new Error(`Analysis contains an unknown section: "${rawSectionName}".`);
    sections[sectionName] = normalizeSection(rawSection, sectionName);
  });

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    id: existing?.id || analysisPayload.id || analysisId(),
    createdAt: existing?.createdAt || analysisPayload.createdAt || Date.now(),
    updatedAt: existing ? Date.now() : analysisPayload.updatedAt || Date.now(),
    sourceFormat: analysisPayload.sourceFormat || "detailed-analysis-json",
    mockName: asString(analysisPayload.mockName),
    date: asString(analysisPayload.date),
    overallReflection: asString(analysisPayload.overallReflection),
    overallPercentile: asNumberOrNull(analysisPayload.overallPercentile),
    overallTopperScore: asNumberOrNull(analysisPayload.overallTopperScore),
    structureText: asString(analysisPayload.structureText),
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

function fillableQuestion(questionNumber) {
  return {
    questionNumber,
    result: "Unreviewed",
    outcomeReason: "",
    questionType: "MCQ",
    topic: "",
    timeTaken: null,
    averageTime: null,
    notes: "",
  };
}

function blocksForTemplateSection(scoreSection) {
  const totalQuestions = Math.max(1, Number(scoreSection.totalQuestions) || 1);
  const blocks = Array.isArray(scoreSection.questionBlocks) && scoreSection.questionBlocks.length > 0
    ? scoreSection.questionBlocks
    : [{ type: "independent", name: "Questions", startQuestion: 1, endQuestion: totalQuestions }];

  return blocks.map((block, idx) => {
    const start = Number(block.startQuestion || 1);
    const end = Number(block.endQuestion || start);
    return {
      type: block.type === "set" ? "set" : "independent",
      name: block.name || `${block.type === "set" ? "Set" : "Independent"} ${idx + 1}`,
      topic: "",
      questions: Array.from({ length: Math.max(0, end - start + 1) }, (_, questionIdx) => fillableQuestion(start + questionIdx)),
    };
  });
}

function buildTemplateInformation(mock, sections) {
  const includedSections = SECTIONS.filter((section) => sections[section]);
  const mockContext = includedSections.reduce((acc, section) => {
    const scoreSection = mock.sections?.[section] || mock[section];
    acc[section] = {
      loggedScore: scoreSection.manualTotalMarks ?? scoreSection.totalMarks ?? null,
      totalQuestions: scoreSection.totalQuestions ?? null,
      attempted: scoreSection.attempted ?? null,
      correct: scoreSection.correct ?? null,
      questionBlocks: scoreSection.questionBlocks || [],
    };
    return acc;
  }, {});

  return {
    purpose: "This file explains the detailed mock analysis JSON accepted by Odyssey and includes an empty analysis object for this exact logged mock.",
    howToUse: [
      "Give this whole JSON file plus your raw review data to an AI assistant.",
      "Ask it to fill only the analysis object. It can remove the information object before returning the final JSON, but Odyssey can also import this whole file and will read analysis automatically.",
      "Keep the section names and question numbers aligned with the logged mock unless you first edit Paper structure inside Odyssey.",
      "You do not need to create id, createdAt, updatedAt, schemaVersion, insightDimensions, or summary fields; Odyssey creates those when importing.",
    ],
    acceptedTopLevelImportShapes: [
      "A clean analysis object with mockName, date, overallReflection, structureText, and sections.",
      "This guide format with information and analysis objects. Odyssey imports the analysis object and ignores information.",
    ],
    scoringModel: {
      Correct: 3,
      WrongMCQ: -1,
      WrongTITA: 0,
      Skipped: 0,
      Unreviewed: 0,
      note: "Score mismatch warnings are shown only after every question in a section is reviewed.",
    },
    allowedValues: {
      sections: SECTIONS,
      result: RESULT_VALUES,
      questionType: QUESTION_TYPES,
      blockType: ["set", "independent"],
      topicsBySection: TOPIC_OPTIONS,
      outcomeReasonsBySectionAndResult: OUTCOME_REASONS,
    },
    fieldRules: {
      "analysis.mockName": "String. Usually the mock or exam name.",
      "analysis.date": "String in YYYY-MM-DD format.",
      "analysis.overallReflection": "String. Overall review notes.",
      "analysis.overallPercentile": "Number from 0 to 100, or null.",
      "analysis.overallTopperScore": "Number, or null.",
      "analysis.structureText": "String summary of the paper structure.",
      "section.percentile": "Number from 0 to 100, or null.",
      "section.topperScore": "Number, or null.",
      "section.notes": "String section-level notes.",
      "block.type": "Must be set or independent.",
      "block.topic": "For set blocks, choose one topic from topicsBySection for that section, or leave blank.",
      "question.result": "Choose one of Correct, Wrong, Skipped, or Unreviewed.",
      "question.outcomeReason": "For Correct/Wrong/Skipped, choose one value from outcomeReasonsBySectionAndResult for that section/result. Leave blank for Unreviewed.",
      "question.questionType": "Choose MCQ or TITA.",
      "question.topic": "For independent questions, choose one topic from topicsBySection for that section, or leave blank. Set questions inherit block.topic.",
      "question.timeTaken": "Seconds as a number, or null.",
      "question.averageTime": "Benchmark seconds as a number, or null.",
      "question.notes": "String question-level notes.",
    },
    constraints: [
      "Each section should contain the same number of questions as the logged mock.",
      "Question numbers should stay unique inside each section.",
      "Do not invent extra sections outside VARC, DILR, and Quant.",
      "Use null, not an empty string, for unknown numeric fields.",
      "Extra fields are safe to omit. Unknown helper fields are ignored by the importer unless they replace the analysis object.",
    ],
    mockContext,
  };
}

function buildStructureText(mock, sections) {
  return SECTIONS
    .filter((section) => sections[section])
    .map((section) => {
      const scoreSection = mock.sections?.[section] || mock[section];
      const total = scoreSection?.totalQuestions ?? 0;
      const blockSummary = (scoreSection?.questionBlocks || [])
        .map((block) => `${block.name || block.type}: Q${block.startQuestion}-${block.endQuestion}`)
        .join(", ");
      return `${section}: ${total} questions${blockSummary ? ` (${blockSummary})` : ""}`;
    })
    .join("\n");
}

export function makeSampleDetailedAnalysis(mock) {
  const sections = {};
  SECTIONS.forEach((sectionName) => {
    const scoreSection = mock.sections?.[sectionName] || mock[sectionName];
    if (!scoreSection) return;
    sections[sectionName] = {
      section: sectionName,
      percentile: scoreSection.percentile ?? null,
      topperScore: scoreSection.topperScore ?? null,
      notes: "",
      blocks: blocksForTemplateSection(scoreSection),
    };
  });

  const analysis = {
    sourceFormat: "odyssey-detailed-analysis-template",
    mockName: mock.source,
    date: mock.date,
    overallReflection: "",
    overallPercentile: null,
    overallTopperScore: null,
    structureText: buildStructureText(mock, sections),
    sections,
  };

  return {
    information: buildTemplateInformation(mock, sections),
    analysis,
  };
}
