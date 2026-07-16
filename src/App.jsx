import { useEffect, useState } from "react";
import { COLORS, FONT_IMPORT, THEME_COLORS } from "./constants";
import { useMockEntries } from "./hooks/useMockEntries";
import { useSettings, normalizeSettings } from "./hooks/useSettings";
import { normalizeStoredMocks } from "./lib/mockStorage";
import Header from "./components/layout/Header";
import TabNav from "./components/layout/TabNav";
import Toast from "./components/ui/Toast";
import MockLogTab from "./components/tabs/MockLogTab";
import TrendsTab from "./components/tabs/TrendsTab";
import OverviewTab from "./components/tabs/OverviewTab";
import AboutTab from "./components/tabs/AboutTab";
import AnalysisTab from "./components/tabs/AnalysisTab";
import AnalysisInsightsDataTab from "./components/tabs/AnalysisInsightsDataTab";
import SettingsTab from "./components/tabs/SettingsTab";

const THEME_STORAGE_KEY = "cat-mock-tracker:theme";

function loadThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
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
      --color-primary: ${values.primary};
      --color-primary-hover: ${values.primaryHover};
      --color-on-primary: ${values.onPrimary};
      --color-hover: ${values.hover};
      --color-focus-ring: ${values.focusRing};
      --shadow-card: ${values.shadowCard};
      --shadow-floating: ${values.shadowFloating};
      color-scheme: ${themeName};
    }
  `;
}

export default function CATMockTracker() {
  const [activeTab, setActiveTab] = useState("overview");
  const [analysisMockId, setAnalysisMockId] = useState(null);
  const [theme, setTheme] = useState(loadThemePreference);

  const {
    sectionStats, insights, weakestAnalysis, mocks, entriesWithComputed,
    marksSeries, attemptRateSeries, marksPerAttemptSeries, negMarksLostSeries, hardnessRatioSeries,
    toast,
    addScoreOnlyAnalysis, attachAnalysis, loadSample, deleteMock,
    importMocks, exportMocks,
  } = useMockEntries();

  const {
    settings,
    updateProfile,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    importScheduleEntries,
    replaceSettings,
  } = useSettings();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme preference simply won't persist if localStorage is unavailable.
    }
  }, [theme]);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleOpenAnalysis = (mockId) => {
    setAnalysisMockId(mockId);
    setActiveTab("analysis");
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        />

        <TabNav activeTab={activeTab} onChange={handleTabChange} />

        <div key={activeTab} className="animate-fade-up flex flex-col gap-6">
          {activeTab === "overview" && (
            <OverviewTab
              mocks={mocks}
              insights={insights}
              weakestAnalysis={weakestAnalysis}
              settings={settings}
            />
          )}

          {activeTab === "log" && (
            <MockLogTab
              mocks={mocks}
              settings={settings}
              onLoadSample={loadSample}
              onOpenAnalysis={handleOpenAnalysis}
              onCreateMock={addScoreOnlyAnalysis}
              onDeleteMock={deleteMock}
            />
          )}

          {activeTab === "analysis" && (
            <AnalysisTab
              mocks={mocks}
              selectedMockId={analysisMockId}
              settings={settings}
              onSelectMock={setAnalysisMockId}
              onSaveAnalysis={attachAnalysis}
            />
          )}

          {activeTab === "analysisInsights" && (
            <AnalysisInsightsDataTab mocks={mocks} />
          )}

          {activeTab === "trends" && (
            <TrendsTab
              mocks={mocks}
              entriesWithComputed={entriesWithComputed}
              marksSeries={marksSeries}
              attemptRateSeries={attemptRateSeries}
              marksPerAttemptSeries={marksPerAttemptSeries}
              negMarksLostSeries={negMarksLostSeries}
              hardnessRatioSeries={hardnessRatioSeries}
              sectionStats={sectionStats}
              settings={settings}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              settings={settings}
              mocks={mocks}
              onUpdateProfile={updateProfile}
              onAddScheduleEntry={addScheduleEntry}
              onUpdateScheduleEntry={updateScheduleEntry}
              onDeleteScheduleEntry={deleteScheduleEntry}
              onImportScheduleEntries={importScheduleEntries}
              onExportData={handleExportData}
              onImportData={handleImportData}
            />
          )}

          {activeTab === "about" && <AboutTab />}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
