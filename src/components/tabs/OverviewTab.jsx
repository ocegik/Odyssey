import { Suspense, lazy, useMemo } from "react";
import { ClipboardCheck, Lightbulb } from "lucide-react";
import { COLORS, SECTIONS, SHADOW, TYPE } from "../../constants";
import { fmtDate, fmtNum, fmtPct } from "../../lib/format";
import { computePacing, mockTotalMarks, computeAdaptiveTarget, avgOfLastN, bestMarks } from "../../lib/compute";
import { latestKnownPercentile, mockOverallPercentile, percentileCaveat } from "../../lib/percentile";
import { computeSyllabusStats, getHighFrequencyRemaining, getLeastCompletedMacroTopics } from "../../lib/syllabusModel";
import SectionBadge from "../ui/SectionBadge";
import ChartFrame from "../charts/ChartFrame";
import CollegeTargetsPanel from "../CollegeTargetsPanel";
import CountdownHero, { QuickStatsCard } from "../CountdownHero";
import WeakestSectionCard from "../charts/WeakestSectionCard";
import InsightList from "../charts/InsightList";
import SyllabusSnapshotCard from "../SyllabusSnapshotCard";
import SectionTargetPanel, { buildTargetRows, targetGapSummary } from "../SectionTargetPanel";
import Disclosure from "../ui/Disclosure";
import { countWithinReach } from "../../lib/collegeCutoffs";

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
  if (mocks.length === 0) return "Log a mock to start seeing prep signals here.";
  if (mocks.length < 3) return "A few more mocks will make the first meaningful trend easier to read.";
  return "No major swing stands out in the latest data. Keep logging mocks to sharpen the signal.";
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
  const caveat = percentileCaveat(percentile);

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
              Percentile{percentile.estimated && <span style={{ opacity: 0.7 }}> (est.)</span>}
            </span>
            <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: COLORS.ink }}>{fmtNum(percentile.value, 2)}%ile</strong>
          </div>
        )}
      </div>

      {caveat && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{caveat}.</span>}

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

export default function OverviewTab({ mocks, insights, weakestAnalysis, sectionStats, settings, syllabusProgress, onOpenSyllabus }) {
  const graphData = buildOverallMarksData(mocks);
  const latestMock = mocks.length > 0 ? mocks[mocks.length - 1] : null;
  // Not mockOverallPercentile(latestMock): percentile is optional per mock,
  // and one mock logged without it shouldn't blank the college comparison.
  const currentPercentile = latestKnownPercentile(mocks);
  const pacing = computePacing(mocks, settings?.catTargetDate);
  const lastMarks = latestMock ? mockTotalMarks(latestMock) : null;
  const nextTargetMarks = computeAdaptiveTarget(lastMarks, settings?.overallTargetMarks);
  const avgLast3 = avgOfLastN(mocks, 3);
  const bestMarksValue = bestMarks(mocks);

  const syllabusStats = useMemo(() => computeSyllabusStats(syllabusProgress), [syllabusProgress]);
  const highFrequencyRemaining = useMemo(() => getHighFrequencyRemaining(syllabusProgress, 4), [syllabusProgress]);
  const leastCompletedMacroTopics = useMemo(() => getLeastCompletedMacroTopics(syllabusStats, 4), [syllabusStats]);

  const targetRows = useMemo(() => buildTargetRows(sectionStats, settings), [sectionStats, settings]);
  const collegeSummary = currentPercentile
    ? `${countWithinReach(currentPercentile.value)} programs within reach at ${fmtNum(currentPercentile.value, 2)}%ile`
    : "Log a mock with a percentile to compare against cutoffs";

  return (
    <div className="flex flex-col gap-4">
      <CountdownHero
        catTargetDate={settings?.catTargetDate}
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

      <LatestMockSpotlight mocks={mocks} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <ChartFrame title="Insights" icon={Lightbulb} note="Latest signals from your rolling stats" empty={insights.length === 0 ? emptyInsightText(mocks) : null}>
          <InsightList insights={insights} />
        </ChartFrame>

        <WeakestSectionCard analysis={weakestAnalysis} />
      </div>

      <SyllabusSnapshotCard
        stats={syllabusStats}
        highFrequencyRemaining={highFrequencyRemaining}
        leastCompletedMacroTopics={leastCompletedMacroTopics}
        onOpenSyllabus={onOpenSyllabus}
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
            <p className="text-sm" style={{ color: COLORS.inkMuted }}>Log a mock to see overall marks across dates.</p>
          ) : (
            <Suspense fallback={<div style={{ height: 280 }} aria-busy="true" />}>
              <OverallMarksChart data={graphData} />
            </Suspense>
          )}
        </div>
      </Disclosure>

      <Disclosure id="overview.colleges" title="College targets" summary={collegeSummary}>
        <div className="pt-4">
          <CollegeTargetsPanel percentile={currentPercentile} />
        </div>
      </Disclosure>
    </div>
  );
}
