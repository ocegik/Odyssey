import {
  TOPIC_REGISTRY_VERSION,
  TOPIC_NODES,
  getTopicNode,
  isValidTagTopic,
} from "./topicRegistry";

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
    "Data Interpretation": "dilr-di",
    "Data Sufficiency": "dilr-di-data-sufficiency",
    "Puzzles & Arrangements": "dilr-lr",
    Reasoning: "dilr-lr",
    // This label spans two different syllabus branches and is not safe to
    // assign to either Venn leaf without reviewing the original question.
    "Sets & Venn Diagrams": null,
  },
  VARC: {
    "Reading Comprehension": "varc-rc",
    "Verbal Ability": "varc-va",
  },
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
  const explicitId = rawTopicRef && typeof rawTopicRef === "object" ? rawTopicRef.topicId : null;
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

export function legacyLabelForTopicId(topicId) {
  return legacyLabelByTopicId[topicId] || getTopicNode(topicId)?.name || "";
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
