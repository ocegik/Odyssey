import { useCallback, useEffect, useRef, useState } from "react";
import { SECTIONS } from "../constants";
import { uid } from "../lib/format";
import { fetchRemoteValue, saveRemoteValue } from "../lib/cloudStore";

const STORAGE_KEY = "cat-mock-tracker:settings";
const REMOTE_KEY = "settings";
const REMOTE_SAVE_DEBOUNCE_MS = 600;

const EMPTY_SECTION_TARGETS = SECTIONS.reduce((acc, section) => {
  acc[section] = null;
  return acc;
}, {});

// Page-content width presets for the "Layout" slider in Settings — three
// steps, matching the widths already tried while dialing this in by hand.
export const LAYOUT_WIDTH_OPTIONS = [
  { key: "cozy", label: "Cozy", px: 1024 },
  { key: "comfortable", label: "Comfortable", px: 1240 },
  { key: "wide", label: "Wide", px: 1440 },
];
const DEFAULT_LAYOUT_WIDTH = "comfortable";

const EMPTY_SETTINGS = {
  studentName: "",
  catTargetDate: "",
  overallTargetMarks: null,
  overallTargetPercentile: null,
  sectionTargetMarks: EMPTY_SECTION_TARGETS,
  mockSchedule: [],
  layoutWidth: DEFAULT_LAYOUT_WIDTH,
};

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nonNegativeOrNull(value) {
  const n = numberOrNull(value);
  return n !== null && n >= 0 ? n : null;
}

function percentileOrNull(value) {
  const n = numberOrNull(value);
  return n !== null && n >= 0 && n <= 100 ? n : null;
}

function normalizeScheduleEntry(item, idx = 0) {
  const date = typeof item?.date === "string" ? item.date : "";
  const examName = typeof item?.examName === "string" ? item.examName.trim() : "";

  if (!date) throw new Error(`Schedule entry ${idx + 1} is missing "date".`);
  if (!examName) throw new Error(`Schedule entry ${idx + 1} is missing "examName".`);

  return {
    id: item.id || uid(),
    date,
    examName,
  };
}

function normalizeSectionTargets(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return SECTIONS.reduce((acc, section) => {
    acc[section] = nonNegativeOrNull(source[section]);
    return acc;
  }, {});
}

export function normalizeSettings(raw) {
  const profile = raw && typeof raw === "object" ? raw : {};
  const rawSchedule = Array.isArray(profile.mockSchedule) ? profile.mockSchedule : [];
  return {
    studentName: typeof profile.studentName === "string" ? profile.studentName : "",
    catTargetDate: typeof profile.catTargetDate === "string" ? profile.catTargetDate : "",
    overallTargetMarks: nonNegativeOrNull(profile.overallTargetMarks),
    overallTargetPercentile: percentileOrNull(profile.overallTargetPercentile),
    sectionTargetMarks: normalizeSectionTargets(profile.sectionTargetMarks),
    mockSchedule: rawSchedule.map(normalizeScheduleEntry).sort((a, b) => a.date.localeCompare(b.date)),
    layoutWidth: LAYOUT_WIDTH_OPTIONS.some((opt) => opt.key === profile.layoutWidth) ? profile.layoutWidth : DEFAULT_LAYOUT_WIDTH,
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : EMPTY_SETTINGS;
  } catch {
    return EMPTY_SETTINGS;
  }
}

function parseScheduleImport(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.mockSchedule)
      ? parsed.mockSchedule
      : Array.isArray(parsed?.schedule)
        ? parsed.schedule
        : null;

  if (!entries) throw new Error('Schedule JSON must be an array or an object with "mockSchedule".');
  return entries.map(normalizeScheduleEntry);
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [remoteReady, setRemoteReady] = useState(false);
  const remoteSaveTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable — settings just won't persist across reloads.
    }
  }, [settings]);

  // Reconcile the local cache against Supabase on mount: remote wins if it
  // exists; otherwise this is a first sync and local settings get pushed up.
  useEffect(() => {
    let cancelled = false;
    fetchRemoteValue(REMOTE_KEY).then((remote) => {
      if (cancelled) return;
      if (remote) setSettings(normalizeSettings(remote));
      setRemoteReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced cloud sync so keystroke-driven profile edits collapse into one write.
  useEffect(() => {
    if (!remoteReady) return;
    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = setTimeout(() => {
      saveRemoteValue(REMOTE_KEY, settings);
    }, REMOTE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(remoteSaveTimer.current);
  }, [settings, remoteReady]);

  const updateProfile = useCallback((patch) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      overallTargetMarks: patch.overallTargetMarks !== undefined ? nonNegativeOrNull(patch.overallTargetMarks) : prev.overallTargetMarks,
      overallTargetPercentile: patch.overallTargetPercentile !== undefined ? percentileOrNull(patch.overallTargetPercentile) : prev.overallTargetPercentile,
    }));
  }, []);

  const updateSectionTarget = useCallback((section, value) => {
    setSettings((prev) => ({
      ...prev,
      sectionTargetMarks: { ...prev.sectionTargetMarks, [section]: nonNegativeOrNull(value) },
    }));
  }, []);

  const addScheduleEntry = useCallback((entry) => {
    const normalized = normalizeScheduleEntry(entry);
    setSettings((prev) => ({
      ...prev,
      mockSchedule: [...prev.mockSchedule, normalized].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, []);

  const updateScheduleEntry = useCallback((id, entry) => {
    const normalized = normalizeScheduleEntry({ ...entry, id });
    setSettings((prev) => ({
      ...prev,
      mockSchedule: prev.mockSchedule.map((item) => (item.id === id ? normalized : item)).sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, []);

  const deleteScheduleEntry = useCallback((id) => {
    setSettings((prev) => ({
      ...prev,
      mockSchedule: prev.mockSchedule.filter((item) => item.id !== id),
    }));
  }, []);

  const importScheduleEntries = useCallback((raw) => {
    const incoming = parseScheduleImport(raw).map((entry) => ({ ...entry, id: uid() }));
    setSettings((prev) => ({
      ...prev,
      mockSchedule: [...prev.mockSchedule, ...incoming].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    return incoming.length;
  }, []);

  // Destructive replace (backup restore), not a merge — used by the combined
  // data-export/import flow in App.jsx, distinct from importScheduleEntries above.
  const replaceSettings = useCallback((raw) => {
    const normalized = normalizeSettings(raw);
    setSettings(normalized);
  }, []);

  return {
    settings,
    updateProfile,
    updateSectionTarget,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    importScheduleEntries,
    replaceSettings,
  };
}
