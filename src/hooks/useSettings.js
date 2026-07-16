import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "../lib/format";
import { fetchRemoteValue, saveRemoteValue } from "../lib/cloudStore";

const STORAGE_KEY = "cat-mock-tracker:settings";
const REMOTE_KEY = "settings";
const REMOTE_SAVE_DEBOUNCE_MS = 600;

const EMPTY_SETTINGS = {
  studentName: "",
  catTargetDate: "",
  overallTargetMarks: null,
  overallTargetPercentile: null,
  mockSchedule: [],
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
  const targetMarks = numberOrNull(item?.targetMarks);

  if (!date) throw new Error(`Schedule entry ${idx + 1} is missing "date".`);
  if (!examName) throw new Error(`Schedule entry ${idx + 1} is missing "examName".`);
  if (targetMarks === null || targetMarks < 0) throw new Error(`Schedule entry ${idx + 1} needs a valid "targetMarks".`);

  return {
    id: item.id || uid(),
    date,
    examName,
      targetMarks,
  };
}

function normalizeSettings(raw) {
  const profile = raw && typeof raw === "object" ? raw : {};
  const rawSchedule = Array.isArray(profile.mockSchedule) ? profile.mockSchedule : [];
  return {
    studentName: typeof profile.studentName === "string" ? profile.studentName : "",
    catTargetDate: typeof profile.catTargetDate === "string" ? profile.catTargetDate : "",
    overallTargetMarks: nonNegativeOrNull(profile.overallTargetMarks),
    overallTargetPercentile: percentileOrNull(profile.overallTargetPercentile),
    mockSchedule: rawSchedule.map(normalizeScheduleEntry).sort((a, b) => a.date.localeCompare(b.date)),
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

  return {
    settings,
    updateProfile,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    importScheduleEntries,
  };
}
