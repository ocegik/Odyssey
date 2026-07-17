import { SECTIONS } from "../constants";
import { uid } from "./format";
import { normalizeDetailedAnalysis } from "./analysisModel";

export const DATASET_VERSION = 2;

const SECTION_INPUT_FIELDS = [
  "attemptedMCQ", "attemptedTITA", "rightMCQ", "rightTITA",
  "wrongMCQ", "wrongTITA", "totalQuestions", "percentile", "topperScore", "notes",
  "manualTotalMarks", "scoreEntryMode", "questionSetCount", "questionBlocks",
];

const mockId = () => uid().replace(/^e_/, "m_");
const numberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function normalizeQuestionBlocks(rawBlocks, totalQuestions) {
  const blocks = Array.isArray(rawBlocks) ? rawBlocks : [];
  const normalized = blocks
    .map((block, idx) => {
      const startQuestion = Number(block.startQuestion || block.start || 0);
      const endQuestion = Number(block.endQuestion || block.end || 0);
      if (!Number.isInteger(startQuestion) || !Number.isInteger(endQuestion) || startQuestion < 1 || endQuestion < startQuestion) return null;
      return {
        id: block.id || uid(),
        type: block.type === "set" ? "set" : "independent",
        name: block.name ? String(block.name) : `${block.type === "set" ? "Set" : "Independent"} ${idx + 1}`,
        startQuestion,
        endQuestion,
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) return normalized;
  if (Number(totalQuestions) > 0) {
    return [{
      id: uid(),
      type: "independent",
      name: "Questions",
      startQuestion: 1,
      endQuestion: Number(totalQuestions),
    }];
  }
  return [];
}

function normalizeSectionPayload(item, idx, parentMockId) {
  const hasManualMarks = item.manualTotalMarks !== undefined && item.manualTotalMarks !== null && item.manualTotalMarks !== "";
  const isScoreOnly = item.scoreEntryMode === "score-only" || hasManualMarks;
  if (!SECTIONS.includes(item.section)) throw new Error(`Entry ${idx + 1} has an invalid section: "${item.section}".`);

  const totalQuestions = Number(item.totalQuestions || 0);
  const questionBlocks = normalizeQuestionBlocks(item.questionBlocks, totalQuestions);

  return {
    id: item.id || uid(),
    mockId: parentMockId || item.mockId || mockId(),
    createdAt: item.createdAt || Date.now() + idx,
    section: item.section,
    attemptedMCQ: Number(item.attemptedMCQ || 0),
    attemptedTITA: Number(item.attemptedTITA || 0),
    rightMCQ: Number(item.rightMCQ || 0),
    rightTITA: Number(item.rightTITA || 0),
    wrongMCQ: Number(item.wrongMCQ || 0),
    wrongTITA: Number(item.wrongTITA || 0),
    totalQuestions,
    percentile: numberOrNull(item.percentile),
    topperScore: numberOrNull(item.topperScore),
    manualTotalMarks: numberOrNull(item.manualTotalMarks),
    scoreEntryMode: isScoreOnly ? "score-only" : item.scoreEntryMode || "detailed-score",
    questionSetCount: numberOrNull(item.questionSetCount) ?? questionBlocks.filter((block) => block.type === "set").length,
    questionBlocks,
    notes: item.notes ? String(item.notes) : "",
  };
}

function normalizeMock(rawMock, idx) {
  const id = rawMock.id || mockId();
  const sectionSource = rawMock.sections || {};
  const sectionItems = Array.isArray(sectionSource)
    ? sectionSource
    : Object.entries(sectionSource).map(([section, value]) => ({ ...value, section: value?.section || section }));

  const sections = {};
  sectionItems.forEach((item, sectionIdx) => {
    const section = normalizeSectionPayload(
      {
        ...item,
        date: rawMock.date,
        source: rawMock.source,
      },
      sectionIdx,
      id
    );
    sections[section.section] = section;
  });

  if (!rawMock.date || !rawMock.source) {
    throw new Error(`Mock ${idx + 1} is missing "date" or "source".`);
  }

  return {
    id,
    createdAt: rawMock.createdAt || Math.min(...Object.values(sections).map((e) => e.createdAt), Date.now() + idx),
    date: rawMock.date,
    source: String(rawMock.source),
    scoreEntryMode: rawMock.scoreEntryMode || null,
    manualTotalMarks: numberOrNull(rawMock.manualTotalMarks),
    sections,
    analysis: rawMock.analysis ? normalizeDetailedAnalysis(rawMock.analysis) : null,
  };
}

function migrateFlatEntriesToMocks(rawEntries) {
  const buckets = new Map();
  const out = [];

  rawEntries.forEach((item, idx) => {
    const section = normalizeSectionPayload(item, idx, item.mockId);
    const key = item.mockId || `${item.date}||${String(item.source)}`;
    const existingBucket = buckets.get(key) || [];
    let mock = existingBucket.find((candidate) => !candidate.sections[section.section]);

    if (!mock) {
      const id = item.mockId && existingBucket.length === 0 ? item.mockId : mockId();
      mock = {
        id,
        createdAt: section.createdAt,
        date: item.date,
        source: String(item.source),
        sections: {},
      };
      existingBucket.push(mock);
      buckets.set(key, existingBucket);
      out.push(mock);
    }

    const ownedSection = { ...section, mockId: mock.id };
    mock.sections[ownedSection.section] = ownedSection;
    mock.createdAt = Math.min(mock.createdAt, ownedSection.createdAt);
  });

  return out;
}

export function normalizeMockDataset(raw) {
  if (Array.isArray(raw)) return migrateFlatEntriesToMocks(raw);
  if (raw && Array.isArray(raw.mocks)) return raw.mocks.map(normalizeMock);
  throw new Error("File must contain a JSON array of entries or a mock dataset with a mocks array.");
}

export function flattenMockEntries(mocks) {
  return mocks.flatMap((mock) =>
    SECTIONS
      .map((section) => mock.sections[section])
      .filter(Boolean)
      .map((entry) => ({
        ...entry,
        mockId: mock.id,
        mockCreatedAt: mock.createdAt,
        date: mock.date,
        source: mock.source,
      }))
  );
}

function sectionToRaw(section) {
  const out = {
    id: section.id,
    mockId: section.mockId,
    createdAt: section.createdAt,
    section: section.section,
  };
  SECTION_INPUT_FIELDS.forEach((field) => {
    out[field] = section[field] ?? (field === "notes" ? "" : null);
  });
  return out;
}

export function toMockDataset(mocks) {
  return {
    version: DATASET_VERSION,
    mocks: mocks.map((mock) => ({
      id: mock.id,
      createdAt: mock.createdAt,
      date: mock.date,
      source: mock.source,
      scoreEntryMode: mock.scoreEntryMode || null,
      manualTotalMarks: mock.manualTotalMarks ?? null,
      analysis: mock.analysis || null,
      sections: SECTIONS.reduce((acc, section) => {
        if (mock.sections[section]) acc[section] = sectionToRaw(mock.sections[section]);
        return acc;
      }, {}),
    })),
  };
}

export function computeMockViews(mocks, computeDerived) {
  return mocks.map((mock) => ({
    ...mock,
    sections: SECTIONS.reduce((acc, section) => {
      if (mock.sections[section]) {
        acc[section] = computeDerived({
          ...mock.sections[section],
          mockId: mock.id,
          mockCreatedAt: mock.createdAt,
          date: mock.date,
          source: mock.source,
        });
      }
      return acc;
    }, {}),
  }));
}

export function addScoreOnlyMock(mocks, payload) {
  const id = payload.id || mockId();
  const createdAt = Date.now();
  const sections = {};
  payload.sections.forEach((section, idx) => {
    sections[section.section] = normalizeSectionPayload({
      id: uid(),
      mockId: id,
      createdAt: createdAt + idx,
      section: section.section,
      manualTotalMarks: section.manualTotalMarks,
      questionSetCount: section.questionSetCount,
      questionBlocks: section.questionBlocks,
      totalQuestions: section.totalQuestions || 0,
      percentile: section.percentile,
      topperScore: section.topperScore,
      scoreEntryMode: "score-only",
      notes: section.notes || "",
    }, idx, id);
  });

  return [
    ...mocks,
    {
      id,
      createdAt,
      date: payload.date,
      source: payload.source,
      scoreEntryMode: "score-only",
      manualTotalMarks: numberOrNull(payload.totalMarks),
      sections,
      analysis: payload.analysis ? normalizeDetailedAnalysis(payload.analysis) : null,
    },
  ];
}

export function attachAnalysisToMocks(mocks, mockId, rawAnalysis) {
  return mocks.map((mock) => (
    mock.id === mockId
      ? { ...mock, analysis: normalizeDetailedAnalysis(rawAnalysis, mock.analysis) }
      : mock
  ));
}

export function removeMock(mocks, id) {
  return mocks.filter((mock) => mock.id !== id);
}

/**
 * Shared by the manual "Log mock" form (MockLogTab) and JSON import
 * (parseScoreOnlyMockImport below) so both enforce the same question-range
 * rules instead of two copies drifting apart.
 */
export function validateSectionBlockCoverage(section) {
  const totalQuestions = Number(section.totalQuestions);
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1) return [`${section.section}: enter total questions.`];

  const seen = new Map();
  const errors = [];
  (section.questionBlocks || []).forEach((block) => {
    const start = Number(block.startQuestion);
    const end = Number(block.endQuestion);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > totalQuestions) {
      errors.push(`${section.section}: ${block.name || "block"} has an invalid question range.`);
      return;
    }
    for (let q = start; q <= end; q += 1) {
      seen.set(q, (seen.get(q) || 0) + 1);
    }
  });

  for (let q = 1; q <= totalQuestions; q += 1) {
    if (!seen.has(q)) errors.push(`${section.section}: question ${q} is not covered by any set/independent block.`);
    if (seen.get(q) > 1) errors.push(`${section.section}: question ${q} is covered more than once.`);
  }
  return errors;
}

function sectionListFromImport(sections) {
  if (Array.isArray(sections)) return sections;
  if (sections && typeof sections === "object") {
    return Object.entries(sections).map(([key, value]) => ({ ...value, section: value?.section || key }));
  }
  return [];
}

function normalizeImportSection(raw, label) {
  const section = raw?.section;
  if (!SECTIONS.includes(section)) {
    throw new Error(`${label}: invalid or missing section "${section ?? ""}" (must be one of ${SECTIONS.join(", ")}).`);
  }

  const scoreValue = raw.score !== undefined ? raw.score : raw.manualTotalMarks;
  const score = Number(scoreValue);
  if (!Number.isFinite(score)) {
    throw new Error(`${label} ${section}: "score" (or "manualTotalMarks") must be a number.`);
  }

  const totalQuestions = Number(raw.totalQuestions || 0);
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1) {
    throw new Error(`${label} ${section}: "totalQuestions" must be a positive whole number.`);
  }

  // questionBlocks is optional on import — when omitted, normalizeSectionPayload's
  // normalizeQuestionBlocks() fallback builds one block spanning all questions,
  // which is valid by construction, so coverage only needs checking when the
  // caller supplied their own custom block structure.
  const hasCustomBlocks = Array.isArray(raw.questionBlocks) && raw.questionBlocks.length > 0;
  if (hasCustomBlocks) {
    const coverageErrors = validateSectionBlockCoverage({ section, totalQuestions, questionBlocks: raw.questionBlocks });
    if (coverageErrors.length > 0) throw new Error(`${label} ${coverageErrors.join(" ")}`);
  }

  return {
    section,
    manualTotalMarks: score,
    totalQuestions,
    questionBlocks: hasCustomBlocks ? raw.questionBlocks : undefined,
    questionSetCount: raw.questionSetCount,
    percentile: raw.percentile,
    topperScore: raw.topperScore,
    notes: raw.notes,
  };
}

function normalizeImportMock(raw, idx) {
  const label = `Mock ${idx + 1}`;
  if (!raw || typeof raw !== "object") throw new Error(`${label}: must be a JSON object.`);
  if (!raw.date) throw new Error(`${label}: missing "date".`);
  if (!raw.source) throw new Error(`${label}: missing "source".`);

  const sectionList = sectionListFromImport(raw.sections);
  if (sectionList.length === 0) throw new Error(`${label} (${raw.date} ${raw.source}): "sections" must include at least one section.`);

  const detailedLabel = `${label} (${raw.date} ${raw.source})`;
  const sections = sectionList.map((section) => normalizeImportSection(section, detailedLabel));
  const totalMarks = sections.reduce((sum, section) => sum + section.manualTotalMarks, 0);

  return {
    date: raw.date,
    source: String(raw.source).trim(),
    totalMarks,
    sections,
    analysis: raw.analysis || undefined,
  };
}

/**
 * Parses JSON for the Mock Log tab's "Import JSON" action: one mock object,
 * an array of mocks, or { mocks: [...] }. Each mock accepts the same fields
 * the manual score-only form submits (see MockLogTab.jsx submitMock). This
 * is additive (new mocks get appended via addScoreOnlyMock) and distinct
 * from the Settings > Data Backup restore, which replaces the whole dataset.
 * Every mock is validated before any payload is returned, so a bad entry
 * can't cause a partial import.
 */
export function parseScoreOnlyMockImport(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.mocks)
      ? parsed.mocks
      : parsed && typeof parsed === "object"
        ? [parsed]
        : null;

  if (!list) throw new Error('Mock JSON must be an object, an array of mocks, or { "mocks": [...] }.');
  if (list.length === 0) throw new Error("Mock JSON contains no mocks.");

  const errors = [];
  const payloads = [];
  list.forEach((item, idx) => {
    try {
      payloads.push(normalizeImportMock(item, idx));
    } catch (err) {
      errors.push(err.message);
    }
  });

  if (errors.length > 0) throw new Error(errors.join(" "));
  return payloads;
}
