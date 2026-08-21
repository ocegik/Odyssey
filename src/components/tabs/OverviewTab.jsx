import { Suspense, lazy, useMemo } from "react";
import { ArrowRight, ClipboardCheck, Flame, Lightbulb, Sparkles } from "lucide-react";
import { COLORS, SECTIONS, SHADOW, TYPE } from "../../constants";
import { fmtDate, fmtNum, fmtPct } from "../../lib/format";
import { computePacing, mockTotalMarks, computeAdaptiveTarget, avgOfLastN, bestMarks } from "../../lib/compute";
import { mockOverallPercentile } from "../../lib/percentile";
import { computeSyllabusStats, getHighFrequencyRemaining, getLeastCompletedMacroTopics } from "../../lib/syllabusModel";
import SectionBadge from "../ui/SectionBadge";
import ChartFrame from "../charts/ChartFrame";
import CountdownHero, { QuickStatsCard } from "../CountdownHero";
import WeakestSectionCard from "../charts/WeakestSectionCard";
import InsightList from "../charts/InsightList";
import SyllabusSnapshotCard from "../SyllabusSnapshotCard";
import SectionTargetPanel, { buildTargetRows, targetGapSummary } from "../SectionTargetPanel";
import Disclosure from "../ui/Disclosure";
import { QUICK_MATH_LEVELS, accuracy, getLevelProgress, isLevelUnlocked, normalizeQuickMathProgress } from "../../lib/quickMath";
import { catExamDateForYear } from "../../lib/dateMath";
import { createChartShareImage, createListShareImage, shareSeries, SHARE_COLORS } from "../../lib/shareImage";
import ShareImageButton from "../ui/ShareImageButton";

const OverallMarksChart = lazy(() => import("../charts/OverallMarksChart"));

/* Mocks logged without any score would otherwise plot as a hole in the line
   (mockTotalMarks returns null for them) — dropping them keeps the trend
   continuous and honest instead of implying a zero. */
function buildOverallMarksData(mocks) {
  return mocks
    .map((mock) => ({
      label: `${fmtDate(mock.date)} - ${mock.source}`,
      marks: mockTotalMarks(mock),
    }))
    .filter((row) => row.marks !== null);
}

function emptyInsightText(mocks) {
  if (mocks.length === 0) return "Log a mock to see personalised insights.";
  if (mocks.length < 3) return "Log more mocks before drawing a trend.";
  return "Recent mocks do not show a clear change.";
}

/* The one thing a user opening the app actually wants first: how did the
   last mock go, and how does it compare to the one before it. Kept as its
   own card, above the fold, ahead of the rolling-signal insights below. */
function LatestMockSpotlight({ mocks }) {
  if (mocks.length === 0) return null;
  const latest = mocks[mocks.length - 1];
  const prev = mocks.length > 1 ? mocks[mocks.length - 2] : null;
  const marks = mockTotalMarks(latest);
  const prevMarks = prev ? mockTotalMarks(prev) : null;
  const delta = marks !== null && prevMarks !== null ? marks - prevMarks : null;
  const percentile = mockOverallPercentile(latest);

  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={15} style={{ color: COLORS.inkMuted }} />
          <h3 style={TYPE.chartTitle}>Latest mock</h3>
        </div>
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>{fmtDate(latest.date)} · {latest.source}</span>
      </div>

      <div className="flex items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Overall marks</span>
          <div className="flex items-baseline gap-2">
            <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 34, color: COLORS.ink }}>{fmtNum(marks, 1)}</strong>
            {delta !== null && (
              <span className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: delta >= 0 ? COLORS.good : COLORS.danger }}>
                {delta >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(delta), 1)} vs last
              </span>
            )}
          </div>
        </div>
        {percentile !== null && (
          <div className="flex flex-col gap-1">
            <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>
              Overall percentile
            </span>
            <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: COLORS.ink }}>{fmtNum(percentile.value, 2)}%ile</strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SECTIONS.map((section) => {
          const s = latest[section];
          return (
            <div key={section} className="flex flex-col gap-1.5 p-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
              <SectionBadge section={section} size="sm" />
              {s ? (
                <>
                  <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, color: COLORS.ink }}>{fmtNum(s.totalMarks, 1)} marks</strong>
                  <span className="text-xs" style={{ color: COLORS.inkMuted }}>{fmtPct(s.overallAccuracy)} acc · {fmtPct(s.attemptRate)} attempt</span>
                </>
              ) : (
                <span className="text-xs" style={{ color: COLORS.inkMuted }}>Not logged</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickMathCard({ progress: rawProgress, onOpenQuickMath, studentName }) {
  const progress = normalizeQuickMathProgress(rawProgress);
  const currentLevel = [...QUICK_MATH_LEVELS]
    .reverse()
    .find((level) => isLevelUnlocked(progress, level.id)) || QUICK_MATH_LEVELS[0];
  const levelProgress = getLevelProgress(progress, currentLevel.id);

  return (
    <section
      className="p-5 sm:p-6"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: COLORS.primary }} />
            <h2 style={TYPE.panelTitle}>Quick Math</h2>
          </div>
          <p className="mt-1 text-sm leading-5" style={{ color: COLORS.inkMuted }}>
            {progress.totalAnswered
              ? `You are practising at the ${currentLevel.label} level.`
              : "Short mental-math drills for CAT preparation."}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <ShareImageButton createImage={() => createListShareImage({ title: "Quick Math Progress", studentName, subtitle: currentLevel.label, items: [{ label: "Level", text: currentLevel.label, color: SHARE_COLORS.primary }, { label: "Accuracy", text: `${accuracy(progress.correct, progress.totalAnswered)}%`, color: SHARE_COLORS.dilr }, { label: "Current streak", text: `${progress.currentStreak}`, color: SHARE_COLORS.primary }], filename: "odyssey-quick-math-progress.png" })} />
        <button
          type="button"
          onClick={onOpenQuickMath}
          className="flex items-center gap-2 px-3.5 py-2 text-sm"
          style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
        >
          Practice <ArrowRight size={15} />
        </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="p-3" style={{ background: COLORS.surface2, borderRadius: 8 }}>
          <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>Level</div>
          <div className="mt-1 text-sm" style={{ color: COLORS.ink, fontWeight: 700 }}>{currentLevel.label}</div>
        </div>
        <div className="p-3" style={{ background: COLORS.surface2, borderRadius: 8 }}>
          <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>Accuracy</div>
          <div className="mt-1 text-sm" style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
            {accuracy(progress.correct, progress.totalAnswered)}%
          </div>
        </div>
        <div className="p-3" style={{ background: COLORS.surface2, borderRadius: 8 }}>
          <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>Streak</div>
          <div className="mt-1 flex items-center gap-1 text-sm" style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
            <Flame size={15} style={{ color: COLORS.warn }} /> {progress.currentStreak}
          </div>
        </div>
      </div>

      {progress.totalAnswered > 0 && (
        <p className="mt-3 text-xs" style={{ color: COLORS.inkMuted }}>
          {levelProgress.correct} correct answers in {currentLevel.label} · {progress.xp} XP earned
        </p>
      )}
    </section>
  );
}

export default function OverviewTab({ mocks, insights, weakestAnalysis, sectionStats, settings, syllabusProgress, onOpenSyllabus, onOpenQuickMath }) {
  const graphData = buildOverallMarksData(mocks);
  const latestMock = mocks.length > 0 ? mocks[mocks.length - 1] : null;
  const catTargetDate = catExamDateForYear(settings?.catTargetYear);
  const pacing = computePacing(mocks, catTargetDate);
  const lastMarks = latestMock ? mockTotalMarks(latestMock) : null;
  const nextTargetMarks = computeAdaptiveTarget(lastMarks, settings?.overallTargetMarks);
  const avgLast3 = avgOfLastN(mocks, 3);
  const bestMarksValue = bestMarks(mocks);

  const syllabusStats = useMemo(() => computeSyllabusStats(syllabusProgress), [syllabusProgress]);
  const highFrequencyRemaining = useMemo(() => getHighFrequencyRemaining(syllabusProgress, 4), [syllabusProgress]);
  const leastCompletedMacroTopics = useMemo(() => getLeastCompletedMacroTopics(syllabusStats, 4), [syllabusStats]);

  const targetRows = useMemo(() => buildTargetRows(sectionStats, settings), [sectionStats, settings]);
  return (
    <div className="flex flex-col gap-4">
      <CountdownHero
        catTargetYear={settings?.catTargetYear}
        preparationStartDate={settings?.preparationStartDate}
        overallTargetPercentile={settings?.overallTargetPercentile}
        mockSchedule={settings?.mockSchedule}
        nextTargetMarks={nextTargetMarks}
      />

      <QuickStatsCard
        mocksLogged={mocks.length}
        latestMarks={lastMarks}
        avgLast3={avgLast3}
        bestMarksValue={bestMarksValue}
        pacing={pacing}
      />

      <QuickMathCard
        progress={settings?.quickMathProgress}
        onOpenQuickMath={onOpenQuickMath}
        studentName={settings?.studentName}
      />

      <LatestMockSpotlight mocks={mocks} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <ChartFrame title="Insights" icon={Lightbulb} action={insights.length ? <ShareImageButton createImage={() => createListShareImage({ title: "Mock Insights", studentName: settings?.studentName, items: insights.map((insight) => ({ label: `${insight.section}${insight.title ? ` · ${insight.title}` : ""}`, text: insight.text, color: insight.section === "VARC" ? SHARE_COLORS.varc : insight.section === "DILR" ? SHARE_COLORS.dilr : SHARE_COLORS.quant })), filename: "odyssey-mock-insights.png" })} /> : null} empty={insights.length === 0 ? emptyInsightText(mocks) : null}>
          <InsightList insights={insights} />
        </ChartFrame>

        <WeakestSectionCard analysis={weakestAnalysis} />
      </div>

      <SyllabusSnapshotCard
        stats={syllabusStats}
        highFrequencyRemaining={highFrequencyRemaining}
        leastCompletedMacroTopics={leastCompletedMacroTopics}
        onOpenSyllabus={onOpenSyllabus}
        studentName={settings?.studentName}
      />

      {/* Below the daily glance: still one click away, but not competing
          with it every time the app is opened for a 10-second check. */}
      {targetRows.length > 0 && (
        <Disclosure id="overview.targets" title="Gap to section targets" summary={targetGapSummary(targetRows)}>
          <SectionTargetPanel rows={targetRows} />
        </Disclosure>
      )}

      <Disclosure
        id="overview.marksChart"
        title="Overall marks by mock"
        summary={graphData.length ? `${graphData.length} scored mocks · best ${fmtNum(bestMarksValue, 0)}` : "No scored mocks yet"}
      >
        <div className="pt-4">
          {graphData.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.inkMuted }}>No scored mocks have been logged yet.</p>
          ) : (
            <>
              <div className="mb-3 flex justify-end"><ShareImageButton createImage={() => createChartShareImage({ title: "Mock Marks Trend", studentName: settings?.studentName, data: graphData, series: [shareSeries.overall], metrics: [{ label: "Latest marks", value: fmtNum(lastMarks, 1) }, { label: "Best marks", value: fmtNum(bestMarksValue, 1) }], filename: "odyssey-mock-marks-trend.png" })} /></div>
              <Suspense fallback={<div style={{ height: 280 }} aria-busy="true" />}>
                <OverallMarksChart data={graphData} />
              </Suspense>
            </>
          )}
        </div>
      </Disclosure>

    </div>
  );
}
