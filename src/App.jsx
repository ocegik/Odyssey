import { useEffect, useState } from "react";
import { COLORS, FONT_IMPORT, THEME_COLORS } from "./constants";
import { useMockEntries } from "./hooks/useMockEntries";
import { useSettings } from "./hooks/useSettings";
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
      --color-hover: ${values.hover};
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
    sectionStats, insights, mocks,
    marksSeries, attemptRateSeries,
    toast,
    addScoreOnlyAnalysis, attachAnalysis, loadSample, deleteMock,
  } = useMockEntries();

  const {
    settings,
    updateProfile,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    importScheduleEntries,
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

  return (
    <div data-theme={theme} style={{ background: COLORS.bg, minHeight: "100%", color: COLORS.ink, fontFamily: "'Inter', sans-serif" }} className="w-full">
      <style>{`
        ${FONT_IMPORT}
        ${themeVariableCSS("light", THEME_COLORS.light)}
        ${themeVariableCSS("dark", THEME_COLORS.dark)}
        * { box-sizing: border-box; }
        html, body, #root { background: ${COLORS.bg}; }
        input:focus, select:focus, button:focus-visible { outline: 2px solid ${COLORS.ink}; outline-offset: 1px; }
        button { cursor: pointer; transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease; }
        input, select, textarea { transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease; }
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

        {activeTab === "overview" && (
          <OverviewTab
            mocks={mocks}
            insights={insights}
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
            marksSeries={marksSeries}
            attemptRateSeries={attemptRateSeries}
            sectionStats={sectionStats}
            settings={settings}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            settings={settings}
            onUpdateProfile={updateProfile}
            onAddScheduleEntry={addScheduleEntry}
            onUpdateScheduleEntry={updateScheduleEntry}
            onDeleteScheduleEntry={deleteScheduleEntry}
            onImportScheduleEntries={importScheduleEntries}
          />
        )}

        {activeTab === "about" && <AboutTab />}
      </div>

      <Toast toast={toast} />
    </div>
  );
}
