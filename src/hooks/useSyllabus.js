import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRemoteValue, saveRemoteValue } from "../lib/cloudStore";
import { ALL_MICRO_TOPICS, STATUS_FILTERS, FREQUENCY_BUCKETS, SYLLABUS_TREE } from "../lib/syllabusModel";

const STORAGE_KEY = "cat-mock-tracker:syllabus";
const REMOTE_KEY = "syllabus";
const REMOTE_SAVE_DEBOUNCE_MS = 600;

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
  return {
    completed: Boolean(source.completed),
    completedAt: typeof source.completedAt === "string" ? source.completedAt : null,
    mockAccuracy: numberOrNull(source.mockAccuracy),
    attempts: Number.isFinite(source.attempts) ? source.attempts : 0,
    priorityScore: numberOrNull(source.priorityScore),
    revisionHistory: Array.isArray(source.revisionHistory) ? source.revisionHistory : [],
    notes: typeof source.notes === "string" ? source.notes : "",
    resources: Array.isArray(source.resources) ? source.resources : [],
    masteryLevel: source.masteryLevel ?? null,
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

function normalizeState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    progress: normalizeProgress(source.progress),
    expanded: normalizeExpanded(source.expanded),
    filters: normalizeFilters(source.filters),
  };
}

function emptyState() {
  return { progress: {}, expanded: defaultExpanded(), filters: DEFAULT_FILTERS };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function toggleInList(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function useSyllabus() {
  const [state, setState] = useState(loadState);
  const [remoteReady, setRemoteReady] = useState(false);
  const remoteSaveTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable — syllabus progress just won't persist across reloads.
    }
  }, [state]);

  // Same reconcile-then-debounced-sync pattern as useSettings/useMockEntries:
  // remote wins on first load if present, otherwise local state gets pushed up.
  useEffect(() => {
    let cancelled = false;
    fetchRemoteValue(REMOTE_KEY).then((remote) => {
      if (cancelled) return;
      if (remote) setState(normalizeState(remote));
      setRemoteReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteReady) return;
    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = setTimeout(() => {
      saveRemoteValue(REMOTE_KEY, state);
    }, REMOTE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(remoteSaveTimer.current);
  }, [state, remoteReady]);

  const updateMicroProgress = useCallback((microTopicId, patch) => {
    setState((prev) => {
      const current = normalizeMicroProgress(prev.progress[microTopicId]);
      const next = normalizeMicroProgress({ ...current, ...patch });
      return { ...prev, progress: { ...prev.progress, [microTopicId]: next } };
    });
  }, []);

  const toggleMicroComplete = useCallback((microTopicId) => {
    setState((prev) => {
      const current = normalizeMicroProgress(prev.progress[microTopicId]);
      const completed = !current.completed;
      const next = { ...current, completed, completedAt: completed ? new Date().toISOString() : null };
      return { ...prev, progress: { ...prev.progress, [microTopicId]: next } };
    });
  }, []);

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
    expanded: state.expanded,
    filters: state.filters,
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
  };
}
