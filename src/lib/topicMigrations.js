import {
  TOPIC_REGISTRY_VERSION,
  TOPIC_NODES,
  getTopicNode,
  isValidTagTopic,
} from "./topicRegistry";
import { isAnalysisQuestionTypeId, isSetTopicId } from "./analysisTaxonomies";

/*
 * These are compatibility mappings for the former analysis vocabulary. They
 * are not a second taxonomy: each deterministic entry points at one canonical
 * syllabus node. Ambiguous labels intentionally remain unresolved.
 */
const LEGACY_ANALYSIS_TOPIC_MAP = {
  Quant: {
    Arithmetic: "qa-arithmetic",
    Algebra: "qa-algebra",
    "Geometry & Mensuration": "qa-geometry-mensuration",
    "Number System": "qa-number-systems",
    "Modern Math": "qa-modern-mathematics",
  },
  DILR: {
    "Data Interpretation": "dilr-set-data-interpretation",
    "Data Sufficiency": "dilr-set-data-sufficiency",
    "Puzzles & Arrangements": "dilr-set-arrangements",
    Reasoning: "dilr-set-reasoning-puzzles",
    // This label spans two different syllabus branches and is not safe to
    // assign to either Venn leaf without reviewing the original question.
    "Sets & Venn Diagrams": null,
  },
  VARC: {
    "Reading Comprehension": "varc-rc",
    "Verbal Ability": "varc-va",
    "Passage Domain": null,
    "Passage-domain familiarity": null,
    // Compact RC passage / set taxonomy.
    Philosophy: "varc-rc-philosophy-abstract",
    History: "varc-rc-history",
    Literature: "varc-rc-literature-arts",
    "Arts & Culture": "varc-rc-literature-arts",
    Psychology: "varc-rc-society-culture",
    Economics: "varc-rc-economics-business",
    "Politics & Society": "varc-rc-society-culture",
    "Biology & Medicine": "varc-rc-science",
    "Physics & Chemistry": "varc-rc-science",
    Technology: "varc-rc-science",
    Environment: "varc-rc-science",
    Mixed: null,
    // Merged & legacy domain aliases
    "Art & Architecture": "varc-rc-literature-arts",
    "Culture & Society": "varc-rc-society-culture",
    Linguistics: "varc-rc-literature-arts",
    "Religion & Mythology": "varc-rc-society-culture",
    Sociology: "varc-rc-society-culture",
    "Political Science": "varc-rc-society-culture",
    Anthropology: "varc-rc-society-culture",
    Law: "varc-rc-society-culture",
    Education: "varc-rc-society-culture",
    Biology: "varc-rc-science",
    "Medicine & Healthcare": "varc-rc-science",
    Neuroscience: "varc-rc-science",
    Physics: "varc-rc-science",
    Chemistry: "varc-rc-science",
    "Astronomy & Space": "varc-rc-science",
    Astronomy: "varc-rc-science",
    Mathematics: "varc-rc-science",
    "Computer Science": "varc-rc-science",
    "Artificial Intelligence": "varc-rc-science",
    AI: "varc-rc-science",
    Engineering: "varc-rc-science",
    "Internet & Digital Society": "varc-rc-science",
    Finance: "varc-rc-economics-business",
    Marketing: "varc-rc-economics-business",
    Management: "varc-rc-economics-business",
    Entrepreneurship: "varc-rc-economics-business",
    "Environmental Science": "varc-rc-science",
    Geography: "varc-rc-science",
    "Current Affairs": null,
    "Mixed / Interdisciplinary": null,
  },
};

const RETIRED_TOPIC_ID_MAP = {
  "varc-rc-philosophy": "varc-rc-philosophy-abstract",
  "varc-rc-literature": "varc-rc-literature-arts",
  "varc-rc-arts-culture": "varc-rc-literature-arts",
  "varc-rc-psychology": "varc-rc-society-culture",
  "varc-rc-economics": "varc-rc-economics-business",
  "varc-rc-politics-society": "varc-rc-society-culture",
  "varc-rc-biology-medicine": "varc-rc-science",
  "varc-rc-physics-chemistry": "varc-rc-science",
  "varc-rc-technology": "varc-rc-science",
  "varc-rc-environment": "varc-rc-science",
  "dilr-di": "dilr-set-data-interpretation",
  "dilr-di-data-sufficiency": "dilr-set-data-sufficiency",
  "dilr-lr": "dilr-set-reasoning-puzzles",
};

const RETIRED_TOPIC_ID_LABELS = {
  "varc-rc-domain-familiarity": "Passage Domain",
  "varc-rc-mixed": "Mixed",
};

const legacyLabelByTopicId = Object.entries(LEGACY_ANALYSIS_TOPIC_MAP).reduce((out, [, mappings]) => {
  Object.entries(mappings).forEach(([label, topicId]) => {
    if (topicId && !out[topicId]) out[topicId] = label;
  });
  return out;
}, {});

function canonicalTopicByName(section, value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return TOPIC_NODES.find((topic) => (
    topic.taggable
    && isValidTagTopic(topic.id, section)
    && topic.name.toLowerCase() === normalized
  )) || null;
}

export function resolveTopicReference(section, rawTopicRef, rawTopic) {
  const rawExplicitId = rawTopicRef && typeof rawTopicRef === "object" ? rawTopicRef.topicId : null;
  const explicitId = RETIRED_TOPIC_ID_MAP[rawExplicitId] || rawExplicitId;
  if (explicitId && isValidTagTopic(explicitId, section)) {
    return {
      topicId: explicitId,
      source: rawTopicRef.source === "migration" ? "migration" : "user",
      taxonomyVersion: Number(rawTopicRef.taxonomyVersion) || TOPIC_REGISTRY_VERSION,
    };
  }

  const label = String(rawTopic || "").trim();
  const mappedId = LEGACY_ANALYSIS_TOPIC_MAP[section]?.[label];
  if (mappedId && isValidTagTopic(mappedId, section)) {
    return { topicId: mappedId, source: "migration", taxonomyVersion: TOPIC_REGISTRY_VERSION };
  }

  const canonical = canonicalTopicByName(section, label);
  if (canonical) {
    return { topicId: canonical.id, source: "migration", taxonomyVersion: TOPIC_REGISTRY_VERSION };
  }

  return null;
}

export function resolveAnalysisQuestionTypeReference(section, rawTopicRef) {
  const rawId = rawTopicRef && typeof rawTopicRef === "object" ? rawTopicRef.topicId : null;
  const topicId = RETIRED_TOPIC_ID_MAP[rawId] || rawId;
  if (!isAnalysisQuestionTypeId(section, topicId)) return null;
  return {
    topicId,
    source: rawTopicRef.source === "migration" ? "migration" : "user",
    taxonomyVersion: Number(rawTopicRef.taxonomyVersion) || TOPIC_REGISTRY_VERSION,
  };
}

export function isSetTopicReference(section, topicRef) {
  return isSetTopicId(section, topicRef?.topicId);
}

export function legacyLabelForTopicId(topicId) {
  return legacyLabelByTopicId[topicId] || getTopicNode(topicId)?.name || RETIRED_TOPIC_ID_LABELS[topicId] || "";
}

export function legacyTopicMappings() {
  return LEGACY_ANALYSIS_TOPIC_MAP;
}

export function collectUnresolvedLegacyTopics(mocks) {
  const unresolved = new Map();
  (mocks || []).forEach((mock) => {
    Object.values(mock.analysis?.sections || {}).forEach((section) => {
      (section.blocks || []).forEach((block) => {
        const blockTopic = block.topic || "";
        if (blockTopic && !block.topicRef) {
          const key = `${section.section}::${blockTopic}`;
          const current = unresolved.get(key) || { section: section.section, label: blockTopic, count: 0, references: [] };
          current.count += block.questions?.length || 1;
          current.references.push({ mockId: mock.id, blockId: block.id });
          unresolved.set(key, current);
        }
        (block.questions || []).forEach((question) => {
          if (!question.topic || question.topicRef) return;
          const key = `${section.section}::${question.topic}`;
          const current = unresolved.get(key) || { section: section.section, label: question.topic, count: 0, references: [] };
          current.count += 1;
          current.references.push({ mockId: mock.id, questionId: question.id });
          unresolved.set(key, current);
        });
      });
    });
  });
  return [...unresolved.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
