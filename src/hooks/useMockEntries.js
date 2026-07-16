import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { SECTIONS } from "../constants";
import { computeDerived, byDateAsc, rollingSeries, buildMockPivot, buildSeries, generateInsights } from "../lib/compute";
import { normalizeStoredMocks, toRaw } from "../lib/mockStorage";
import { makeSampleData } from "../lib/sampleData";
import {
  addScoreOnlyMock,
  attachAnalysisToMocks,
  computeMockViews,
  flattenMockEntries,
} from "../lib/mockModel";

/* Local storage keeps explicit parent mock records. normalizeStoredMocks() still
   migrates older saved datasets so existing local data keeps opening cleanly. */
const STORAGE_KEY = "cat-mock-tracker:entries";

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
  const [mockRecords, setMockRecords] = useState(loadStoredMocks);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Persist each mock/analysis update through the single parent mock dataset.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(mockRecords)));
    } catch {
      // Storage unavailable (quota, private mode, etc.) — don't block the UI.
    }
  }, [mockRecords]);

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

  const mocks = useMemo(() => buildMockPivot(mockViews), [mockViews]);
  const marksSeries = useMemo(() => buildSeries(mocks, (e) => e.totalMarks), [mocks]);
  const attemptRateSeries = useMemo(
    () => buildSeries(mocks, (e) => (e.attemptRate !== null ? +(e.attemptRate * 100).toFixed(1) : null)),
    [mocks]
  );

  const addScoreOnlyAnalysis = useCallback((payload) => {
    setMockRecords((prev) => addScoreOnlyMock(prev, payload));
    showToast("Mock logged");
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

  return {
    sectionStats, insights, mocks,
    marksSeries, attemptRateSeries,
    toast,
    addScoreOnlyAnalysis, attachAnalysis, loadSample,
  };
}
