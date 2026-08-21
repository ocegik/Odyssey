import { getTopicNode } from "./topicRegistry";

// These are deliberately small analysis vocabularies. The IDs belong to the
// syllabus tree, so an analysis tag is always also syllabus evidence.
export const SET_TOPIC_IDS = {
  VARC: [
    "varc-rc-history",
    "varc-rc-society-culture",
    "varc-rc-science",
    "varc-rc-economics-business",
    "varc-rc-philosophy-abstract",
    "varc-rc-literature-arts",
  ],
  DILR: [
    "dilr-set-data-interpretation",
    "dilr-set-arrangements",
    "dilr-set-games-tournaments",
    "dilr-set-sets-venn",
    "dilr-set-reasoning-puzzles",
    "dilr-set-data-sufficiency",
    "dilr-set-mixed",
  ],
};

export const ANALYSIS_QUESTION_TYPE_IDS = {
  VARC: [
    "varc-rc-factual-detail",
    "varc-rc-inference",
    "varc-rc-main-idea",
    "varc-rc-tone",
    "varc-rc-vocab-context",
    "varc-rc-structure-organization",
  ],
  DILR: [
    "dilr-qt-data-extraction",
    "dilr-qt-calculation-comparison",
    "dilr-qt-logical-deduction",
    "dilr-qt-constraint-feasibility",
  ],
};

export function analysisTopicOptions(ids) {
  return (ids || []).map((topicId) => getTopicNode(topicId)).filter(Boolean);
}

export function isSetTopicId(section, topicId) {
  return Boolean(topicId && SET_TOPIC_IDS[section]?.includes(topicId));
}

export function isAnalysisQuestionTypeId(section, topicId) {
  return Boolean(topicId && ANALYSIS_QUESTION_TYPE_IDS[section]?.includes(topicId));
}
