import { SECTIONS } from "../constants";
import { validateSectionBlockCoverage } from "./mockModel";

export const today = () => new Date().toISOString().slice(0, 10);
export const blockId = () => `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function cascadeBlockRanges(blocks, editedId, field, newValue) {
  const editedIdx = blocks.findIndex((block) => block.id === editedId);
  if (editedIdx === -1) return blocks;

  const next = blocks.map((block) => ({ ...block }));
  next[editedIdx][field] = newValue;

  if (field === "endQuestion") {
    for (let i = editedIdx + 1; i < next.length; i += 1) {
      const size = Math.max(0, Number(next[i].endQuestion) - Number(next[i].startQuestion));
      const start = Number(next[i - 1].endQuestion) + 1;
      next[i].startQuestion = start;
      next[i].endQuestion = start + size;
    }
  } else if (field === "startQuestion" && editedIdx > 0) {
    next[editedIdx - 1].endQuestion = newValue - 1;
  }

  return next;
}

const isAutoBlockName = (name, type) => (type === "set" ? /^Set \d+$/.test(name) : name === "Independent Questions");

export function renumberBlockNames(blocks, forceRenameId) {
  let setCount = 0;
  return blocks.map((block) => {
    if (block.type === "set") {
      setCount += 1;
      if (block.id === forceRenameId || isAutoBlockName(block.name, "set")) {
        return { ...block, name: `Set ${setCount}` };
      }
      return block;
    }
    if (block.id === forceRenameId || isAutoBlockName(block.name, "independent")) {
      return { ...block, name: "Independent Questions" };
    }
    return block;
  });
}

const DEFAULT_SECTIONS = [
  {
    section: "VARC",
    score: "",
    totalQuestions: "24",
    attempted: "",
    correct: "",
    percentile: "",
    topperScore: "",
    topperPercentile: "",
    notes: "",
    questionBlocks: [
      { id: blockId(), type: "set", name: "Set 1", startQuestion: 1, endQuestion: 5 },
      { id: blockId(), type: "set", name: "Set 2", startQuestion: 6, endQuestion: 9 },
      { id: blockId(), type: "independent", name: "Independent Questions", startQuestion: 10, endQuestion: 13 },
      { id: blockId(), type: "set", name: "Set 3", startQuestion: 14, endQuestion: 18 },
      { id: blockId(), type: "set", name: "Set 4", startQuestion: 19, endQuestion: 24 },
    ],
  },
  {
    section: "DILR",
    score: "",
    totalQuestions: "22",
    attempted: "",
    correct: "",
    percentile: "",
    topperScore: "",
    topperPercentile: "",
    notes: "",
    questionBlocks: [
      { id: blockId(), type: "set", name: "Set 1", startQuestion: 1, endQuestion: 5 },
      { id: blockId(), type: "set", name: "Set 2", startQuestion: 6, endQuestion: 10 },
      { id: blockId(), type: "set", name: "Set 3", startQuestion: 11, endQuestion: 15 },
      { id: blockId(), type: "set", name: "Set 4", startQuestion: 16, endQuestion: 22 },
    ],
  },
  {
    section: "Quant",
    score: "",
    totalQuestions: "22",
    attempted: "",
    correct: "",
    percentile: "",
    topperScore: "",
    topperPercentile: "",
    notes: "",
    questionBlocks: [
      { id: blockId(), type: "independent", name: "Independent Questions", startQuestion: 1, endQuestion: 22 },
    ],
  },
];

export function emptyMockForm() {
  return {
    date: today(),
    source: "",
    sections: DEFAULT_SECTIONS.map((section) => ({
      ...section,
      questionBlocks: section.questionBlocks.map((block) => ({ ...block, id: blockId() })),
    })),
  };
}

const numToFormValue = (value) => (value === null || value === undefined ? "" : String(value));

export function mockToForm(mock) {
  return {
    date: mock.date,
    source: mock.source,
    sections: DEFAULT_SECTIONS.map((defaultSection) => {
      const existing = mock[defaultSection.section] || mock.sections?.[defaultSection.section];
      if (!existing) {
        return { ...defaultSection, questionBlocks: defaultSection.questionBlocks.map((block) => ({ ...block, id: blockId() })) };
      }
      const questionBlocks = existing.questionBlocks?.length ? existing.questionBlocks : defaultSection.questionBlocks;
      return {
        section: defaultSection.section,
        score: numToFormValue(existing.manualTotalMarks ?? existing.totalMarks),
        totalQuestions: numToFormValue(existing.totalQuestions) || defaultSection.totalQuestions,
        attempted: numToFormValue(existing.attempted),
        correct: numToFormValue(existing.correct),
        percentile: numToFormValue(existing.percentile),
        topperScore: numToFormValue(existing.topperScore),
        topperPercentile: numToFormValue(existing.topperPercentile),
        notes: existing.notes || "",
        questionBlocks: questionBlocks.map((block) => ({ ...block, id: block.id || blockId() })),
      };
    }),
  };
}

export function validateMockForm(form) {
  const errors = [];
  if (!form.date) errors.push("Enter the mock date.");
  if (!form.source.trim()) errors.push("Enter the mock or exam name.");
  form.sections.forEach((section) => {
    const score = Number(section.score);
    if (!Number.isFinite(score)) errors.push(`${section.section}: enter the logged score.`);

    const totalQuestions = Number(section.totalQuestions);
    const attempted = section.attempted === "" ? null : Number(section.attempted);
    const correct = section.correct === "" ? null : Number(section.correct);
    if (attempted !== null) {
      if (!Number.isInteger(attempted) || attempted < 0 || attempted > totalQuestions) {
        errors.push(`${section.section}: attempted must be a whole number between 0 and total questions.`);
      } else if (correct !== null && (!Number.isInteger(correct) || correct < 0 || correct > attempted)) {
        errors.push(`${section.section}: correct must be a whole number between 0 and attempted.`);
      }
    } else if (correct !== null) {
      errors.push(`${section.section}: enter attempted before correct.`);
    }

    if (section.percentile !== "" && (!Number.isFinite(Number(section.percentile)) || Number(section.percentile) < 0 || Number(section.percentile) > 100)) {
      errors.push(`${section.section}: percentile must be a number between 0 and 100.`);
    }
    if (section.topperScore !== "" && !Number.isFinite(Number(section.topperScore))) {
      errors.push(`${section.section}: topper score must be a number.`);
    }
    if (section.topperPercentile !== "" && (!Number.isFinite(Number(section.topperPercentile)) || Number(section.topperPercentile) < 0 || Number(section.topperPercentile) > 100)) {
      errors.push(`${section.section}: topper percentile must be a number between 0 and 100.`);
    }

    errors.push(...validateSectionBlockCoverage(section));
  });
  return errors;
}

export function mockFormToPayload(form) {
  const sections = form.sections.map((section) => ({
    section: section.section,
    manualTotalMarks: Number(section.score),
    totalQuestions: Number(section.totalQuestions),
    attempted: section.attempted === "" ? undefined : Number(section.attempted),
    correct: section.correct === "" ? undefined : Number(section.correct),
    percentile: section.percentile === "" ? undefined : Number(section.percentile),
    topperScore: section.topperScore === "" ? undefined : Number(section.topperScore),
    topperPercentile: section.topperPercentile === "" ? undefined : Number(section.topperPercentile),
    notes: section.notes || undefined,
    questionSetCount: section.questionBlocks.filter((block) => block.type === "set").length,
    questionBlocks: section.questionBlocks.map((block) => ({
      ...block,
      startQuestion: Number(block.startQuestion),
      endQuestion: Number(block.endQuestion),
    })),
  }));

  return {
    date: form.date,
    source: form.source.trim(),
    totalMarks: sections.reduce((sum, section) => sum + section.manualTotalMarks, 0),
    sections,
  };
}

export function structureSummary(section) {
  const sets = section.questionBlocks.filter((block) => block.type === "set").length;
  const independent = section.questionBlocks.filter((block) => block.type === "independent").length;
  const parts = [];
  if (sets) parts.push(`${sets} set${sets === 1 ? "" : "s"}`);
  if (independent) parts.push(`${independent} independent block${independent === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "no blocks yet";
}

export function blankBlockFor(section, type) {
  const lastEnd = section.questionBlocks.reduce((max, block) => Math.max(max, Number(block.endQuestion || 0)), 0);
  const start = Math.min(lastEnd + 1, Number(section.totalQuestions || 1));
  const newBlockId = blockId();
  return {
    id: newBlockId,
    type,
    name: type === "set" ? "Set" : "Independent Questions",
    startQuestion: start,
    endQuestion: start,
  };
}
