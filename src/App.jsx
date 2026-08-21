import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLORS, FONT_IMPORT, THEME_COLORS } from "./constants";
import { useMockEntries } from "./hooks/useMockEntries";
import {
  useSettings,
  normalizeSettings,
  LAYOUT_WIDTH_OPTIONS,
} from "./hooks/useSettings";
import { useSyllabus } from "./hooks/useSyllabus";
import { buildTopicMetrics } from "./lib/topicMetrics";
import { buildRevisionQueue } from "./lib/revisionQueue";
import { useHashTab } from "./hooks/useHashTab";
import { useAuth } from "./hooks/useAuth";
import { useOnboarding } from "./hooks/useOnboarding";
import { useAdminRole } from "./hooks/useAdminRole";
import { normalizeStoredMocks } from "./lib/mockStorage";
import Header from "./components/layout/Header";
import TabNav from "./components/layout/TabNav";
import Toast from "./components/ui/Toast";
import CommandPalette from "./components/CommandPalette";
import OverviewTab from "./components/tabs/OverviewTab";
import AuthLanding from "./components/AuthLanding";
import Homepage from "./components/Homepage";
import Onboarding from "./components/Onboarding";
import LegalPage, { LegalLinks } from "./components/LegalPage";

/* Overview is the landing tab and stays in the main bundle. Everything else
   is split out: the heavy chart/analysis tabs used to force every visitor to
   download all of recharts and the full syllabus dataset before seeing
   anything, on an app that's opened for a 10-second score check most days. */
const SyllabusTab = lazy(() => import("./components/tabs/SyllabusTab"));
const CommunityTab = lazy(() => import("./components/tabs/CommunityTab"));
const QuickMath = lazy(() => import("./components/tabs/QuickMath"));
const MockLogTab = lazy(() => import("./components/tabs/MockLogTab"));
const MockAnalysisPage = lazy(() => import("./components/pages/MockAnalysisPage"));
const TrendsTab = lazy(() => import("./components/tabs/TrendsTab"));
const AnalysisInsightsDataTab = lazy(
  () => import("./components/tabs/AnalysisInsightsDataTab"),
);
const AccountTab = lazy(() => import("./components/tabs/AccountTab"));

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
  const selector =
    themeName === "light"
      ? ':root, [data-theme="light"]'
      : '[data-theme="dark"]';
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

/* The signed-out and onboarding routes use the same token-based components as
   the dashboard. Keep the tokens and base controls available before the main
   workspace mounts so those routes are not rendered as a separate visual
   system (or left with unresolved CSS variables). */
function GlobalThemeStyles() {
  return <style>{`
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
    .theme-hover:not(:disabled):hover { background: ${COLORS.hover} !important; }
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
  `}</style>;
}

/* Tabs render inside <Suspense>; a chunk fetch is fast enough that a spinner
   would flash more than it would inform, so this just holds the height. */
function TabFallback() {
  return <div style={{ minHeight: 240 }} aria-busy="true" />;
}

export default function CATMockTracker() {
  const [activeTab, setActiveTab, linkedMockId] = useHashTab("home");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab]));
  const [theme, setTheme] = useState(loadThemePreference);
  const auth = useAuth();
  const onboarding = useOnboarding(auth.user?.id);
  const admin = useAdminRole(auth.user?.id);
  const previousUserId = useRef(auth.user?.id ?? null);

  const {
    sectionStats,
    insights,
    weakestAnalysis,
    mocks,
    entriesWithComputed,
    marksSeries,
    attemptRateSeries,
    marksPerAttemptSeries,
    percentileSeries,
    toast,
    syncStatus: mocksSyncStatus,
    addScoreOnlyAnalysis,
    editMock,
    attachAnalysis,
    deleteMock,
    importMocks,
    exportMocks,
    importScoreOnlyMocks,
    clearMocksAndAnalysisCache,
  } = useMockEntries({ userId: auth.user?.id });

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
    recordQuickMathResult,
    clearSettingsCache,
  } = useSettings({ userId: auth.user?.id });

  const {
    progress: syllabusProgress,
    revisionEvents: syllabusRevisionEvents,
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
    exportState: exportSyllabusState,
    replaceState: replaceSyllabusState,
    clearSyllabusCache,
  } = useSyllabus({ userId: auth.user?.id });

  const topicMetrics = useMemo(() => buildTopicMetrics(mocks), [mocks]);
  const revisionQueue = useMemo(
    () => buildRevisionQueue(mocks, syllabusRevisionEvents),
    [mocks, syllabusRevisionEvents],
  );

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
    setVisitedTabs((prev) =>
      prev.has(activeTab) ? prev : new Set(prev).add(activeTab),
    );
  }, [activeTab]);

  const handleTabChange = (key) => setActiveTab(key);

  // OAuth can return to any public hash (and an already signed-in person can
  // open one directly). Wait for useAuth's initial session restoration before
  // deciding where to send them; otherwise #/home briefly behaves as a
  // signed-out route and never advances to the dashboard.
  const shouldRedirectSignedInVisitor =
    auth.status === "ready" &&
    Boolean(auth.user) &&
    (activeTab === "home" || activeTab === "login");

  useEffect(() => {
    if (shouldRedirectSignedInVisitor) setActiveTab("overview");
  }, [shouldRedirectSignedInVisitor, setActiveTab]);

  // The normalized analysis row is part of the mock cache in memory. Clear
  // that alongside every other account-scoped slice as soon as logout finishes
  // so another person using this browser never sees a previous account flash.
  const clearAccountData = useCallback(() => {
    clearMocksAndAnalysisCache();
    clearSettingsCache();
    clearSyllabusCache();
  }, [clearMocksAndAnalysisCache, clearSettingsCache, clearSyllabusCache]);

  // Also cover expiry, a sign-out from another tab, and a direct account
  // switch. AuthControl clears immediately for its own button; this observer
  // makes the cache boundary hold for every Supabase auth-state transition.
  useEffect(() => {
    const currentUserId = auth.user?.id ?? null;
    if (previousUserId.current && previousUserId.current !== currentUserId) {
      clearAccountData();
    }
    previousUserId.current = currentUserId;
  }, [auth.user?.id, clearAccountData]);

  const handleOpenAnalysis = (mockId) => {
    setActiveTab("mockAnalysis", { mockId });
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      mocks: exportMocks(),
      settings,
      learningState: exportSyllabusState(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `odyssey-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    await auth.deleteAccount();
    clearAccountData();
    setActiveTab("home");
  };

  const handleImportData = (raw) => {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(
        'Backup file must be a JSON object with a "mocks" field.',
      );
    }
    if (!parsed.mocks) throw new Error('Backup JSON is missing "mocks".');

    // Validate both pieces before committing either, so a bad settings
    // block can't leave mocks replaced with the settings half untouched.
    normalizeStoredMocks(parsed.mocks);
    if (parsed.settings) normalizeSettings(parsed.settings);
    if (parsed.learningState && typeof parsed.learningState !== "object") {
      throw new Error('Backup "learningState" must be an object.');
    }

    const count = importMocks(parsed.mocks);
    if (parsed.settings) replaceSettings(parsed.settings);
    if (parsed.learningState) replaceSyllabusState(parsed.learningState);
    return count;
  };

  const handleCompleteOnboarding = async (profile) => {
    await onboarding.complete(profile);
    // Profile data is initially collected during onboarding, while Account is
    // backed by settings. Seed the same values so the account form reflects
    // the user's answers as soon as the workspace opens.
    updateProfile({
      studentName: profile.displayName,
      catTargetYear: profile.catTargetYear,
      preparationStartDate: profile.preparationStartDate,
      testSeries: profile.testSeries,
      gender: profile.gender,
      currentStatus: profile.currentStatus,
    });
  };

  if (activeTab === "privacy" || activeTab === "terms") {
    return (
      <>
        <GlobalThemeStyles />
        <LegalPage
          page={activeTab}
          theme={theme}
          onToggleTheme={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
        />
      </>
    );
  }

  if (auth.status === "loading") {
    return <><GlobalThemeStyles /><div className="grid min-h-screen place-items-center text-sm" style={{ background: COLORS.bg, color: COLORS.inkMuted }}>Checking your account…</div></>;
  }

  if (shouldRedirectSignedInVisitor) {
    return <><GlobalThemeStyles /><div className="grid min-h-screen place-items-center text-sm" style={{ background: COLORS.bg, color: COLORS.inkMuted }}>Opening your dashboard…</div></>;
  }

  if (activeTab === "home") {
    return <><GlobalThemeStyles /><Homepage isSignedIn={false} /></>;
  }

  if (!auth.user) {
    return <><GlobalThemeStyles /><AuthLanding auth={auth} /></>;
  }

  if (onboarding.status === "loading") {
    return <><GlobalThemeStyles /><div className="grid min-h-screen place-items-center text-sm" style={{ background: COLORS.bg, color: COLORS.inkMuted }}>Preparing your workspace…</div></>;
  }

  if (!onboarding.completed) {
    return <><GlobalThemeStyles /><Onboarding user={auth.user} onComplete={handleCompleteOnboarding} /></>;
  }

  return (
    <div
      data-theme={theme}
      style={{
        background: COLORS.bg,
        minHeight: "100%",
        color: COLORS.ink,
        fontFamily: "'Inter', sans-serif",
      }}
      className="app-root w-full"
    >
      <GlobalThemeStyles />

      <div
        className="app-shell mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 flex flex-col gap-6"
        style={{
          maxWidth:
            LAYOUT_WIDTH_OPTIONS.find((opt) => opt.key === settings.layoutWidth)
              ?.px ?? LAYOUT_WIDTH_OPTIONS[1].px,
        }}
      >
        <Header
          theme={theme}
          onToggleTheme={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
          syncStatuses={[
            mocksSyncStatus,
            settingsSyncStatus,
            syllabusSyncStatus,
          ]}
          auth={auth}
          onSignedOut={clearAccountData}
        />

        <TabNav activeTab={activeTab === "mockAnalysis" ? "mocks" : activeTab} onChange={handleTabChange} isAdmin={admin.isAdmin} />

        {/* Each tab mounts once (on first visit) and is then kept alive and
            toggled with display:none — switching tabs used to unmount/remount
            the whole subtree every time, which re-ran every chart's resize
            measurement and all aggregate computations on every visit. */}
        <Suspense fallback={<TabFallback />}>
          {visitedTabs.has("overview") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "overview" ? "flex" : "none" }}
            >
              <OverviewTab
                mocks={mocks}
                insights={insights}
                weakestAnalysis={weakestAnalysis}
                sectionStats={sectionStats}
                settings={settings}
                syllabusProgress={syllabusProgress}
                onOpenSyllabus={() => handleTabChange("syllabus")}
                onOpenQuickMath={() => handleTabChange("quickMath")}
              />
            </div>
          )}
          {visitedTabs.has("quickMath") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "quickMath" ? "flex" : "none" }}
            >
              <QuickMath
                progress={settings.quickMathProgress}
                onRecordResult={recordQuickMathResult}
              />
            </div>
          )}

          {visitedTabs.has("community") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "community" ? "flex" : "none" }}
            >
              <CommunityTab
                mocks={mocks}
                syllabusProgress={syllabusProgress}
                quickMathProgress={settings.quickMathProgress}
                accountType={onboarding.profile?.account_type}
                onUpdateAccountType={onboarding.updateAccountType}
              />
            </div>
          )}

          {visitedTabs.has("syllabus") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "syllabus" ? "flex" : "none" }}
            >
              <SyllabusTab
                progress={syllabusProgress}
                topicMetrics={topicMetrics}
                revisionQueue={revisionQueue}
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

          {visitedTabs.has("mocks") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "mocks" ? "flex" : "none" }}
            >
              <MockLogTab
                mocks={mocks}
                onOpenAnalysis={handleOpenAnalysis}
                onCreateMock={addScoreOnlyAnalysis}
                onEditMock={editMock}
                onDeleteMock={deleteMock}
                onImportMocks={importScoreOnlyMocks}
              />
            </div>
          )}

          {activeTab === "mockAnalysis" && (
            <div
              className="flex flex-col gap-6"
            >
              <MockAnalysisPage
                mockId={linkedMockId}
                mocks={mocks}
                settings={settings}
                syncStatus={mocksSyncStatus}
                onSaveAnalysis={attachAnalysis}
                onEditMock={editMock}
                onBack={() => handleTabChange("mocks")}
              />
            </div>
          )}

          {visitedTabs.has("analysisInsights") && (
            <div
              className="flex flex-col gap-6"
              style={{
                display: activeTab === "analysisInsights" ? "flex" : "none",
              }}
            >
              <AnalysisInsightsDataTab mocks={mocks} />
            </div>
          )}

          {visitedTabs.has("trends") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "trends" ? "flex" : "none" }}
            >
              <TrendsTab
                mocks={mocks}
                entriesWithComputed={entriesWithComputed}
                marksSeries={marksSeries}
                attemptRateSeries={attemptRateSeries}
                marksPerAttemptSeries={marksPerAttemptSeries}
                percentileSeries={percentileSeries}
                sectionStats={sectionStats}
                settings={settings}
              />
            </div>
          )}

          {visitedTabs.has("account") && (
            <div
              className="flex flex-col gap-6"
              style={{ display: activeTab === "account" ? "flex" : "none" }}
            >
              <AccountTab
                settings={settings}
                mocks={mocks}
                userEmail={auth.user?.email}
                accountType={onboarding.profile?.account_type}
                onUpdateAccountType={onboarding.updateAccountType}
                onUpdateProfile={updateProfile}
                onUpdateSectionTarget={updateSectionTarget}
                onAddScheduleEntry={addScheduleEntry}
                onUpdateScheduleEntry={updateScheduleEntry}
                onDeleteScheduleEntry={deleteScheduleEntry}
                onImportScheduleEntries={importScheduleEntries}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onDeleteAccount={handleDeleteAccount}
              />
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
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />

      <Toast toast={toast} />

      <footer className="app-footer mx-auto flex w-full items-center justify-between gap-4 px-4 pb-6 sm:px-6" style={{ maxWidth: LAYOUT_WIDTH_OPTIONS.find((opt) => opt.key === settings.layoutWidth)?.px ?? LAYOUT_WIDTH_OPTIONS[1].px }}>
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>Odyssey · CAT Mock Tracker</span>
        <LegalLinks compact />
      </footer>
    </div>
  );
}
