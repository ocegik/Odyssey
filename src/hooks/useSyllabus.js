import { useCallback } from "react";
import { uid } from "../lib/format";
import { ALL_MICRO_TOPICS, STATUS_FILTERS, FREQUENCY_BUCKETS, SYLLABUS_TREE } from "../lib/syllabusModel";
import { fetchRemoteSyllabus, saveRemoteSyllabus } from "../lib/cloudStore";
import { useCloudSyncedState } from "./useCloudSyncedState";

const STORAGE_KEY = "cat-mock-tracker:syllabus";
const REMOTE_KEY = "syllabus";
export const LEARNING_STATE_VERSION = 1;

// Keep the shared hook's (remoteKey, value) interface while syllabus uses
// its normalized per-topic table instead of app_storage.
const fetchSyllabusFromTable = () => fetchRemoteSyllabus();
const saveSyllabusToTable = (_remoteKey, value) => saveRemoteSyllabus(value);

const DEFAULT_FILTERS = { search: "", status: "all", frequency: "all" };

// Sections and macro topics start expanded (there are only a handful of
// each, so the full topic list is visible on first load); question-type
// panels on individual micro topics start collapsed since there can be
// dozens of them.
function defaultExpanded() {
  return {
    sections: SYLLABUS_TREE.map((s) => s.id),
    macros: SYLLABUS_TREE.flatMap((s) => s.macroTopics.map((m) => m.id)),
    micros: [],
  };
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Shape kept intentionally wide (mockAccuracy, attempts, priorityScore,
// revisionHistory, notes, resources, masteryLevel) so future modules — mock
// integration, revision planning, AI recommendations — can read/write per
// micro-topic metadata here without a structural migration. Only `completed`
// is actually written to today.
function normalizeMicroProgress(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const completionStatus = source.completionStatus === "completed"
    ? "completed"
    : source.completionStatus === "in_progress"
      ? "in_progress"
      : Boolean(source.completed) ? "completed" : "not_started";
  const legacyMetrics = {};
  ["mockAccuracy", "attempts", "priorityScore", "masteryLevel"].forEach((field) => {
    if (source[field] !== undefined && source[field] !== null) legacyMetrics[field] = source[field];
  });
  if (Array.isArray(source.revisionHistory)) legacyMetrics.revisionHistory = source.revisionHistory;
  return {
    // `completed` remains as a compatibility projection for existing UI and
    // exports; completionStatus is the canonical field going forward.
    completed: completionStatus === "completed",
    completionStatus,
    completedAt: typeof source.completedAt === "string" ? source.completedAt : null,
    notes: typeof source.notes === "string" ? source.notes : "",
    resources: Array.isArray(source.resources) ? source.resources : [],
    ...(Object.keys(legacyMetrics).length > 0 ? { legacyMetrics } : {}),
  };
}

function normalizeProgress(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const microIds = new Set(ALL_MICRO_TOPICS.map((m) => m.id));
  const out = {};
  Object.keys(source).forEach((id) => {
    if (microIds.has(id)) out[id] = normalizeMicroProgress(source[id]);
  });
  return out;
}

function normalizeIdList(raw, validIds) {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(validIds);
  return raw.filter((id) => valid.has(id));
}

function normalizeExpanded(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sectionIds = SYLLABUS_TREE.map((s) => s.id);
  const macroIds = SYLLABUS_TREE.flatMap((s) => s.macroTopics.map((m) => m.id));
  const microIds = ALL_MICRO_TOPICS.map((m) => m.id);
  return {
    sections: raw ? normalizeIdList(source.sections, sectionIds) : defaultExpanded().sections,
    macros: raw ? normalizeIdList(source.macros, macroIds) : defaultExpanded().macros,
    micros: normalizeIdList(source.micros, microIds),
  };
}

function normalizeFilters(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    search: typeof source.search === "string" ? source.search : "",
    status: STATUS_FILTERS.includes(source.status) ? source.status : "all",
    frequency: source.frequency === "all" || FREQUENCY_BUCKETS.includes(source.frequency) ? source.frequency : "all",
  };
}

function normalizeRevisionEvents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((event) => event && typeof event === "object" && typeof event.topicId === "string")
    .map((event) => ({
      id: typeof event.id === "string" ? event.id : uid().replace(/^e_/, "r_"),
      topicId: event.topicId,
      sourceQuestionId: typeof event.sourceQuestionId === "string" ? event.sourceQuestionId : null,
      action: ["queued", "completed", "deferred", "dismissed"].includes(event.action) ? event.action : "queued",
      occurredAt: typeof event.occurredAt === "string" ? event.occurredAt : new Date().toISOString(),
      dueDate: typeof event.dueDate === "string" ? event.dueDate : null,
      note: typeof event.note === "string" ? event.note : "",
    }));
}

export function normalizeLearningState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    learningStateVersion: LEARNING_STATE_VERSION,
    progress: normalizeProgress(source.progress),
    revisionEvents: normalizeRevisionEvents(source.revisionEvents),
    expanded: normalizeExpanded(source.expanded),
    filters: normalizeFilters(source.filters),
  };
}

function emptyState() {
  return {
    learningStateVersion: LEARNING_STATE_VERSION,
    progress: {},
    revisionEvents: [],
    expanded: defaultExpanded(),
    filters: DEFAULT_FILTERS,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeLearningState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function toggleInList(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function useSyllabus({ userId } = {}) {
  const { state, setState, clearState: clearSyllabusCache, status: syncStatus } = useCloudSyncedState({
    storageKey: STORAGE_KEY,
    remoteKey: REMOTE_KEY,
    load: loadState,
    empty: emptyState,
    normalize: normalizeLearningState,
    fetchRemote: fetchSyllabusFromTable,
    saveRemote: saveSyllabusToTable,
    userId,
  });

  const updateMicroProgress = useCallback((microTopicId, patch) => {
    setState((prev) => {
      const current = normalizeMicroProgress(prev.progress[microTopicId]);
      const merged = { ...current, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, "completed") && !Object.prototype.hasOwnProperty.call(patch, "completionStatus")) {
        merged.completionStatus = patch.completed ? "completed" : "not_started";
      }
      const next = normalizeMicroProgress(merged);
      return { ...prev, progress: { ...prev.progress, [microTopicId]: next } };
    });
  }, []);

  const toggleMicroComplete = useCallback((microTopicId) => {
    setState((prev) => {
      const current = normalizeMicroProgress(prev.progress[microTopicId]);
      const completed = !current.completed;
      const next = normalizeMicroProgress({
        ...current,
        completed,
        completionStatus: completed ? "completed" : "not_started",
        completedAt: completed ? new Date().toISOString() : null,
      });
      return { ...prev, progress: { ...prev.progress, [microTopicId]: next } };
    });
  }, []);

  const addRevisionEvent = useCallback((event) => {
    setState((prev) => ({
      ...prev,
      revisionEvents: normalizeRevisionEvents([...prev.revisionEvents, event]),
    }));
  }, []);

  const exportState = useCallback(() => state, [state]);
  const replaceState = useCallback((raw) => setState(normalizeLearningState(raw)), []);

  const toggleSectionExpanded = useCallback((sectionId) => {
    setState((prev) => ({ ...prev, expanded: { ...prev.expanded, sections: toggleInList(prev.expanded.sections, sectionId) } }));
  }, []);

  const toggleMacroExpanded = useCallback((macroTopicId) => {
    setState((prev) => ({ ...prev, expanded: { ...prev.expanded, macros: toggleInList(prev.expanded.macros, macroTopicId) } }));
  }, []);

  const toggleMicroExpanded = useCallback((microTopicId) => {
    setState((prev) => ({ ...prev, expanded: { ...prev.expanded, micros: toggleInList(prev.expanded.micros, microTopicId) } }));
  }, []);

  const expandAll = useCallback(() => {
    setState((prev) => ({ ...prev, expanded: { ...defaultExpanded(), micros: prev.expanded.micros } }));
  }, []);

  const collapseAll = useCallback(() => {
    setState((prev) => ({ ...prev, expanded: { sections: [], macros: [], micros: [] } }));
  }, []);

  const setSearch = useCallback((search) => {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, search } }));
  }, []);

  const setStatusFilter = useCallback((status) => {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, status } }));
  }, []);

  const setFrequencyFilter = useCallback((frequency) => {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, frequency } }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => ({ ...prev, filters: DEFAULT_FILTERS }));
  }, []);

  return {
    progress: state.progress,
    revisionEvents: state.revisionEvents,
    learningStateVersion: state.learningStateVersion,
    expanded: state.expanded,
    filters: state.filters,
    syncStatus,
    updateMicroProgress,
    toggleMicroComplete,
    toggleSectionExpanded,
    toggleMacroExpanded,
    toggleMicroExpanded,
    expandAll,
    collapseAll,
    setSearch,
    setStatusFilter,
    setFrequencyFilter,
    resetFilters,
    addRevisionEvent,
    exportState,
    replaceState,
    clearSyllabusCache,
  };
}
