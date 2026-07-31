import { Suspense, lazy, useEffect, useState } from "react";
import { COLORS, FONT_IMPORT, THEME_COLORS } from "./constants";
import { useMockEntries } from "./hooks/useMockEntries";
import { useSettings, normalizeSettings, LAYOUT_WIDTH_OPTIONS } from "./hooks/useSettings";
import { useSyllabus } from "./hooks/useSyllabus";
import { useHashTab } from "./hooks/useHashTab";
import { normalizeStoredMocks } from "./lib/mockStorage";
import Header from "./components/layout/Header";
import TabNav from "./components/layout/TabNav";
import Toast from "./components/ui/Toast";
import CommandPalette from "./components/CommandPalette";
import OverviewTab from "./components/tabs/OverviewTab";

/* Overview is the landing tab and stays in the main bundle. Everything else
   is split out: the heavy chart/analysis tabs used to force every visitor to
   download all of recharts and the full syllabus dataset before seeing
   anything, on an app that's opened for a 10-second score check most days. */
const SyllabusTab = lazy(() => import("./components/tabs/SyllabusTab"));
const MockLogTab = lazy(() => import("./components/tabs/MockLogTab"));
const TrendsTab = lazy(() => import("./components/tabs/TrendsTab"));
const AboutTab = lazy(() => import("./components/tabs/AboutTab"));
const AnalysisTab = lazy(() => import("./components/tabs/AnalysisTab"));
const AnalysisInsightsDataTab = lazy(() => import("./components/tabs/AnalysisInsightsDataTab"));
const SettingsTab = lazy(() => import("./components/tabs/SettingsTab"));

const THEME_STORAGE_KEY = "cat-mock-tracker:theme";

function loadThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/* Chevron for <select> (see selectStyle in ui/FieldLabel). It has to ship as a
   data URI rather than a lucide icon because it's painted as a background
   image, so the stroke colour is baked in per theme instead of inherited. */
function selectChevronDataURI(strokeColor) {
  const stroke = strokeColor.replace("#", "%23");
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${stroke}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
}

function themeVariableCSS(themeName, values) {
  const selector = themeName === "light" ? ":root, [data-theme=\"light\"]" : "[data-theme=\"dark\"]";
  return `
    ${selector} {
      --color-bg: ${values.bg};
      --color-surface: ${values.surface};
      --color-surface-2: ${values.surface2};
      --color-border: ${values.border};
      --color-ink: ${values.ink};
      --color-ink-muted: ${values.inkMuted};
      --color-varc: ${values.varc};
      --color-varc-soft: ${values.varcSoft};
      --color-dilr: ${values.dilr};
      --color-dilr-soft: ${values.dilrSoft};
      --color-quant: ${values.quant};
      --color-quant-soft: ${values.quantSoft};
      --color-good: ${values.good};
      --color-danger: ${values.danger};
      --color-danger-soft: ${values.dangerSoft};
      --color-warn: ${values.warn};
      --color-warn-soft: ${values.warnSoft};
      --color-info: ${values.info};
      --color-info-soft: ${values.infoSoft};
      --color-primary: ${values.primary};
      --color-primary-hover: ${values.primaryHover};
      --color-on-primary: ${values.onPrimary};
      --color-hover: ${values.hover};
      --color-focus-ring: ${values.focusRing};
      --shadow-card: ${values.shadowCard};
      --shadow-floating: ${values.shadowFloating};
      --select-chevron: ${selectChevronDataURI(values.inkMuted)};
      color-scheme: ${themeName};
    }
  `;
}

/* Tabs render inside <Suspense>; a chunk fetch is fast enough that a spinner
   would flash more than it would inform, so this just holds the height. */
function TabFallback() {
  return <div style={{ minHeight: 240 }} aria-busy="true" />;
}

export default function CATMockTracker() {
  const [activeTab, setActiveTab] = useHashTab("overview");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab]));
  const [analysisMockId, setAnalysisMockId] = useState(null);
  const [theme, setTheme] = useState(loadThemePreference);

  const {
    sectionStats, insights, weakestAnalysis, mocks, entriesWithComputed,
    marksSeries, attemptRateSeries, marksPerAttemptSeries, hardnessRatioSeries, percentileSeries,
    toast, syncStatus: mocksSyncStatus,
    addScoreOnlyAnalysis, editMock, attachAnalysis, loadSample, deleteMock,
    importMocks, exportMocks, importScoreOnlyMocks,
  } = useMockEntries();

  const {
    settings,
    syncStatus: settingsSyncStatus,
    updateProfile,
    updateSectionTarget,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    importScheduleEntries,
    replaceSettings,
  } = useSettings();

  const {
    progress: syllabusProgress,
    expanded: syllabusExpanded,
    filters: syllabusFilters,
    syncStatus: syllabusSyncStatus,
    toggleMicroComplete,
    toggleSectionExpanded,
    toggleMacroExpanded,
    toggleMicroExpanded,
    expandAll: expandAllSyllabus,
    collapseAll: collapseAllSyllabus,
    setSearch: setSyllabusSearch,
    setStatusFilter: setSyllabusStatusFilter,
    setFrequencyFilter: setSyllabusFrequencyFilter,
  } = useSyllabus();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme preference simply won't persist if localStorage is unavailable.
    }
  }, [theme]);

  /* Tabs mount lazily and then stay mounted (see the comment on the tab
     block below), so this has to track every way `activeTab` can change —
     not just clicks. Back/forward and hand-edited hashes go straight through
     useHashTab without passing handleTabChange, and keying off the effect
     covers all of them. */
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  const handleTabChange = (key) => setActiveTab(key);

  const handleOpenAnalysis = (mockId) => {
    setAnalysisMockId(mockId);
    handleTabChange("analysis");
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      mocks: exportMocks(),
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `odyssey-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (raw) => {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error('Backup file must be a JSON object with a "mocks" field.');
    }
    if (!parsed.mocks) throw new Error('Backup JSON is missing "mocks".');

    // Validate both pieces before committing either, so a bad settings
    // block can't leave mocks replaced with the settings half untouched.
    normalizeStoredMocks(parsed.mocks);
    if (parsed.settings) normalizeSettings(parsed.settings);

    const count = importMocks(parsed.mocks);
    if (parsed.settings) replaceSettings(parsed.settings);
    return count;
  };

  return (
    <div data-theme={theme} style={{ background: COLORS.bg, minHeight: "100%", color: COLORS.ink, fontFamily: "'Inter', sans-serif" }} className="w-full">
      <style>{`
        ${FONT_IMPORT}
        ${themeVariableCSS("light", THEME_COLORS.light)}
        ${themeVariableCSS("dark", THEME_COLORS.dark)}
        * { box-sizing: border-box; }
        *, *::before, *::after { transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease; }
        html, body, #root { background: ${COLORS.bg}; }
        input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px ${COLORS.bg}, 0 0 0 5px ${COLORS.focusRing};
        }
        button { cursor: pointer; transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease, box-shadow 120ms ease, transform 100ms ease; }
        input, select, textarea { transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease; }
        .theme-hover { transition: background-color 120ms ease; }
        .theme-hover:hover { background: ${COLORS.hover} !important; }
        [data-theme="dark"] .hover\\:bg-black\\/5:hover,
        [data-theme="dark"] .hover\\:bg-black\\/\\[0\\.03\\]:hover,
        [data-theme="dark"] .hover\\:bg-black\\/\\[0\\.025\\]:hover,
        [data-theme="dark"] .hover\\:bg-black\\/\\[0\\.04\\]:hover,
        [data-theme="dark"] .hover\\:bg-black\\/\\[0\\.05\\]:hover,
        [data-theme="dark"] .hover\\:bg-\\[\\#FBFBF8\\]:hover {
          background-color: ${COLORS.hover} !important;
        }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
      `}</style>

      <div
        className="mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6"
        style={{ maxWidth: LAYOUT_WIDTH_OPTIONS.find((opt) => opt.key === settings.layoutWidth)?.px ?? LAYOUT_WIDTH_OPTIONS[1].px }}
      >
        <Header
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          syncStatuses={[mocksSyncStatus, settingsSyncStatus, syllabusSyncStatus]}
        />

        <TabNav activeTab={activeTab} onChange={handleTabChange} />

        {/* Each tab mounts once (on first visit) and is then kept alive and
            toggled with display:none — switching tabs used to unmount/remount
            the whole subtree every time, which re-ran every chart's resize
            measurement and all aggregate computations on every visit. */}
        <Suspense fallback={<TabFallback />}>
        {visitedTabs.has("overview") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "overview" ? "flex" : "none" }}>
            <OverviewTab
              mocks={mocks}
              insights={insights}
              weakestAnalysis={weakestAnalysis}
              sectionStats={sectionStats}
              settings={settings}
              syllabusProgress={syllabusProgress}
              onOpenSyllabus={() => handleTabChange("syllabus")}
            />
          </div>
        )}

        {visitedTabs.has("syllabus") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "syllabus" ? "flex" : "none" }}>
            <SyllabusTab
              progress={syllabusProgress}
              expanded={syllabusExpanded}
              filters={syllabusFilters}
              onToggleMicroComplete={toggleMicroComplete}
              onToggleSectionExpanded={toggleSectionExpanded}
              onToggleMacroExpanded={toggleMacroExpanded}
              onToggleMicroExpanded={toggleMicroExpanded}
              onExpandAll={expandAllSyllabus}
              onCollapseAll={collapseAllSyllabus}
              onSetSearch={setSyllabusSearch}
              onSetStatusFilter={setSyllabusStatusFilter}
              onSetFrequencyFilter={setSyllabusFrequencyFilter}
            />
          </div>
        )}

        {visitedTabs.has("log") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "log" ? "flex" : "none" }}>
            <MockLogTab
              mocks={mocks}
              settings={settings}
              onLoadSample={loadSample}
              onOpenAnalysis={handleOpenAnalysis}
              onCreateMock={addScoreOnlyAnalysis}
              onEditMock={editMock}
              onDeleteMock={deleteMock}
              onImportMocks={importScoreOnlyMocks}
            />
          </div>
        )}

        {visitedTabs.has("analysis") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "analysis" ? "flex" : "none" }}>
            <AnalysisTab
              mocks={mocks}
              selectedMockId={analysisMockId}
              settings={settings}
              onSelectMock={setAnalysisMockId}
              onSaveAnalysis={attachAnalysis}
              onEditMock={editMock}
            />
          </div>
        )}

        {visitedTabs.has("analysisInsights") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "analysisInsights" ? "flex" : "none" }}>
            <AnalysisInsightsDataTab mocks={mocks} />
          </div>
        )}

        {visitedTabs.has("trends") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "trends" ? "flex" : "none" }}>
            <TrendsTab
              mocks={mocks}
              entriesWithComputed={entriesWithComputed}
              marksSeries={marksSeries}
              attemptRateSeries={attemptRateSeries}
              marksPerAttemptSeries={marksPerAttemptSeries}
              hardnessRatioSeries={hardnessRatioSeries}
              percentileSeries={percentileSeries}
              sectionStats={sectionStats}
              settings={settings}
            />
          </div>
        )}

        {visitedTabs.has("settings") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "settings" ? "flex" : "none" }}>
            <SettingsTab
              settings={settings}
              mocks={mocks}
              onUpdateProfile={updateProfile}
              onUpdateSectionTarget={updateSectionTarget}
              onAddScheduleEntry={addScheduleEntry}
              onUpdateScheduleEntry={updateScheduleEntry}
              onDeleteScheduleEntry={deleteScheduleEntry}
              onImportScheduleEntries={importScheduleEntries}
              onExportData={handleExportData}
              onImportData={handleImportData}
            />
          </div>
        )}

        {visitedTabs.has("about") && (
          <div className="flex flex-col gap-6" style={{ display: activeTab === "about" ? "flex" : "none" }}>
            <AboutTab />
          </div>
        )}
        </Suspense>
      </div>

      <CommandPalette
        mocks={mocks}
        theme={theme}
        onNavigate={handleTabChange}
        onOpenAnalysis={handleOpenAnalysis}
        onExport={handleExportData}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />

      <Toast toast={toast} />
    </div>
  );
}
