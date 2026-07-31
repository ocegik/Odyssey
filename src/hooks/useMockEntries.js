import { useState, useMemo, useCallback, useRef } from "react";
import { SECTIONS } from "../constants";
import { computeDerived, byDateAsc, rollingSeries, buildMockPivot, buildSeries, generateInsights, analyzeWeakest } from "../lib/compute";
import { buildPercentileSeries } from "../lib/percentile";
import { normalizeStoredMocks, toRaw } from "../lib/mockStorage";
import { makeSampleData } from "../lib/sampleData";
import { useCloudSyncedState } from "./useCloudSyncedState";
import {
  addScoreOnlyMock,
  attachAnalysisToMocks,
  computeMockViews,
  flattenMockEntries,
  parseScoreOnlyMockImport,
  removeMock,
  updateScoreOnlyMock,
} from "../lib/mockModel";

/* Local storage keeps explicit parent mock records. normalizeStoredMocks() still
   migrates older saved datasets so existing local data keeps opening cleanly.
   It's a fast local cache; Supabase (see cloudStore.js) is the durable copy. */
const STORAGE_KEY = "cat-mock-tracker:entries";
const REMOTE_KEY = "entries";

function loadStoredMocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeStoredMocks(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Owns the parent mock dataset plus every derived/memoized view the UI
 * currently renders, and every supported mutation.
 *
 * Keeping this in one hook means UI components never touch raw state —
 * they just call the functions this returns.
 */
export function useMockEntries() {
  const {
    state: mockRecords,
    setState: setMockRecords,
    status: syncStatus,
    lastSyncedAt,
  } = useCloudSyncedState({
    storageKey: STORAGE_KEY,
    remoteKey: REMOTE_KEY,
    load: loadStoredMocks,
    normalize: normalizeStoredMocks,
    serialize: toRaw,
  });

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, action) => {
    setToast({ message, action });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2400);
  }, []);

  const mockViews = useMemo(() => computeMockViews(mockRecords, computeDerived), [mockRecords]);
  const entriesWithComputed = useMemo(() => flattenMockEntries(mockViews), [mockViews]);

  const sectionStats = useMemo(() => {
    const out = {};
    SECTIONS.forEach((sec) => {
      const list = rollingSeries(entriesWithComputed.filter((e) => e.section === sec).sort(byDateAsc));
      out[sec] = { list, latest: list.length ? list[list.length - 1] : null };
    });
    return out;
  }, [entriesWithComputed]);

  const insights = useMemo(() => generateInsights(sectionStats), [sectionStats]);
  const weakestAnalysis = useMemo(() => analyzeWeakest(entriesWithComputed), [entriesWithComputed]);

  const mocks = useMemo(() => buildMockPivot(mockViews), [mockViews]);
  const marksSeries = useMemo(() => buildSeries(mocks, (e) => e.totalMarks), [mocks]);
  const attemptRateSeries = useMemo(
    () => buildSeries(mocks, (e) => (e.attemptRate !== null ? +(e.attemptRate * 100).toFixed(1) : null)),
    [mocks]
  );
  const marksPerAttemptSeries = useMemo(
    () => buildSeries(mocks, (e) => (e.marksPerAttempt !== null ? +e.marksPerAttempt.toFixed(2) : null)),
    [mocks]
  );
  const hardnessRatioSeries = useMemo(
    () => buildSeries(mocks, (e) => (e.hardnessRatio !== null && e.hardnessRatio !== undefined ? +(e.hardnessRatio * 100).toFixed(1) : null)),
    [mocks]
  );
  const percentileSeries = useMemo(() => buildPercentileSeries(mocks), [mocks]);

  const addScoreOnlyAnalysis = useCallback((payload) => {
    setMockRecords((prev) => addScoreOnlyMock(prev, payload));
    showToast("Mock logged");
  }, [showToast]);

  const editMock = useCallback((mockId, payload) => {
    setMockRecords((prev) => updateScoreOnlyMock(prev, mockId, payload));
    showToast("Mock updated");
  }, [showToast]);

  const attachAnalysis = useCallback((mockId, rawAnalysis) => {
    try {
      const parsed = typeof rawAnalysis === "string" ? JSON.parse(rawAnalysis) : rawAnalysis;
      const existing = mockRecords.find((mock) => mock.id === mockId);
      if (!existing) throw new Error("Choose a mock before adding analysis.");
      const hadAnalysis = Boolean(existing.analysis);
      setMockRecords((prev) => attachAnalysisToMocks(prev, mockId, parsed));
      showToast(hadAnalysis ? "Analysis updated" : "Analysis attached");
      return true;
    } catch (err) {
      showToast(err.message || "Could not save that analysis.");
      return false;
    }
  }, [mockRecords, showToast]);

  const loadSample = useCallback(() => {
    setMockRecords(makeSampleData());
    showToast("Sample data loaded");
  }, [showToast]);

  const deleteMock = useCallback((mockId) => {
    const removedMock = mockRecords.find((mock) => mock.id === mockId);
    setMockRecords((prev) => removeMock(prev, mockId));
    showToast("Mock deleted", removedMock ? {
      label: "Undo",
      onClick: () => setMockRecords((prev) => (prev.some((mock) => mock.id === mockId) ? prev : [...prev, removedMock])),
    } : undefined);
  }, [mockRecords, showToast]);

  // Additive JSON import for the Mock Log tab — appends parsed mocks on top
  // of whatever's already logged (unlike importMocks below, which replaces
  // the whole dataset for a backup restore).
  const importScoreOnlyMocks = useCallback((raw) => {
    const payloads = parseScoreOnlyMockImport(raw);
    setMockRecords((prev) => payloads.reduce((acc, payload) => addScoreOnlyMock(acc, payload), prev));
    showToast(`Imported ${payloads.length} mock${payloads.length === 1 ? "" : "s"}`);
    return payloads.length;
  }, [showToast]);

  // Destructive replace (backup restore), not a merge — parses/validates
  // fully before committing, mirroring toRaw()'s {version, mocks} shape.
  const importMocks = useCallback((raw) => {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const normalized = normalizeStoredMocks(parsed);
    setMockRecords(normalized);
    showToast(`Imported ${normalized.length} mock${normalized.length === 1 ? "" : "s"}`);
    return normalized.length;
  }, [showToast]);

  const exportMocks = useCallback(() => toRaw(mockRecords), [mockRecords]);

  return {
    sectionStats, insights, weakestAnalysis, mocks, entriesWithComputed,
    marksSeries, attemptRateSeries, marksPerAttemptSeries, hardnessRatioSeries, percentileSeries,
    toast, syncStatus, lastSyncedAt,
    addScoreOnlyAnalysis, editMock, attachAnalysis, loadSample, deleteMock,
    importMocks, exportMocks, importScoreOnlyMocks,
  };
}
