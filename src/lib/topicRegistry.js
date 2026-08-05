import { SYLLABUS_TREE } from "./syllabusModel";

/**
 * Canonical topic registry.
 *
 * `syllabusData.js` owns the topic definitions. This module only builds
 * indexes and lookup helpers from that source; it must not contain a second
 * topic list. Analysis, syllabus progress, and topic analytics can therefore
 * all resolve the same stable IDs.
 */

export const TOPIC_REGISTRY_VERSION = 1;

const SECTION_ROOT_BY_ANALYSIS_SECTION = {
  VARC: "varc",
  DILR: "dilr",
  Quant: "qa",
};

const nodesById = new Map();
const childrenByParentId = new Map();
const macroIdsByAnalysisSection = {};

function addNode(node) {
  if (nodesById.has(node.id)) {
    throw new Error(`Duplicate canonical topic id: ${node.id}`);
  }
  nodesById.set(node.id, node);
  if (node.parentId) {
    const children = childrenByParentId.get(node.parentId) || [];
    children.push(node);
    childrenByParentId.set(node.parentId, children);
  }
}

SYLLABUS_TREE.forEach((section) => {
  addNode({
    id: section.id,
    parentId: null,
    kind: "section",
    name: section.name,
    sectionId: section.id,
    taggable: false,
  });

  section.macroTopics.forEach((macro) => {
    addNode({
      id: macro.id,
      parentId: section.id,
      kind: "macro",
      name: macro.name,
      sectionId: section.id,
      taggable: true,
      weightageLabel: macro.weightageLabel,
    });

    macro.microTopics.forEach((micro) => {
      addNode({
        id: micro.id,
        parentId: macro.id,
        kind: "leaf",
        name: micro.name,
        category: micro.category || null,
        sectionId: section.id,
        taggable: true,
        frequency: micro.frequency,
        frequencyNote: micro.frequencyNote,
        questionTypes: micro.questionTypes,
      });
    });
  });

  const analysisSection = section.colorKey === "Quant" ? "Quant" : section.name;
  macroIdsByAnalysisSection[analysisSection] = section.macroTopics.map((macro) => macro.id);
});

export const TOPIC_NODES = Object.freeze([...nodesById.values()]);

export function getTopicNode(topicId) {
  return nodesById.get(topicId) || null;
}

export function getTopicChildren(topicId) {
  return childrenByParentId.get(topicId) || [];
}

export function getTopicAncestors(topicId) {
  const ancestors = [];
  let current = getTopicNode(topicId);
  while (current?.parentId) {
    current = getTopicNode(current.parentId);
    if (current) ancestors.push(current);
  }
  return ancestors;
}

export function getTopicIdsForAnalysisSection(section) {
  const rootId = SECTION_ROOT_BY_ANALYSIS_SECTION[section];
  return rootId ? (macroIdsByAnalysisSection[section] || []) : [];
}

export function getTopicPickerOptions(section) {
  return getTopicIdsForAnalysisSection(section)
    .map((topicId) => getTopicNode(topicId))
    .filter(Boolean)
    .map((topic) => ({ id: topic.id, label: topic.name, kind: topic.kind }));
}

export function getTopicPath(topicId) {
  const node = getTopicNode(topicId);
  if (!node) return [];
  return [...getTopicAncestors(topicId).reverse(), node];
}

export function isValidTagTopic(topicId, section) {
  const node = getTopicNode(topicId);
  if (!node || !node.taggable) return false;
  const rootId = SECTION_ROOT_BY_ANALYSIS_SECTION[section];
  return Boolean(rootId && getTopicPath(topicId).some((ancestor) => ancestor.id === rootId));
}

export function getTopicRegistrySnapshot() {
  return {
    version: TOPIC_REGISTRY_VERSION,
    nodes: TOPIC_NODES,
  };
}
