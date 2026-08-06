import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../../constants";
import { buildDetailedAnalysisInsights, flattenAnalysisQuestions } from "../../lib/detailedAnalysisInsights";
import { buildAdvancedInsights } from "../../lib/advancedInsights";
import { buildTopSignals } from "../../lib/topSignals";
import { fmtDate, fmtPct } from "../../lib/format";
import { inc, topEntry } from "../../lib/aggregate";
import { selectStyle } from "../ui/FieldLabel";
import {
  detailedInsightIcon,
  SectionReasonTable,
  TimingTable,
  AnalysisTrendChart,
  TopicAccuracyTable,
  AnalysisBarChart,
  DetailedStatCards,
} from "../DetailedAnalysisInsightsPanel";
import { AdvancedStatCards, RecommendationList } from "../AdvancedInsightsPanel";
import ChartFrame from "../charts/ChartFrame";
import InsightList from "../charts/InsightList";
import TopSignals from "../charts/TopSignals";
import EmptyState from "../ui/EmptyState";
import GroupHeading from "../ui/GroupHeading";
import Disclosure from "../ui/Disclosure";

function Panel({ title, children, note }) {
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 style={TYPE.panelTitle}>{title}</h2>
        {note && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

/* Every insight generator downstream (buildDetailedAnalysisInsights,
   buildAdvancedInsights, buildTopSignals) already operates on whatever mock
   array it's handed and gates its cross-mock/trend/recurring insights behind
   their own minimum-sample thresholds — so narrowing the input array to a
   range is enough to make the whole pipeline range-aware. Nothing downstream
   needs to know a range was ever selected. */
const RANGE_OPTIONS = [
  { key: "all", label: "All mocks" },
  { key: "latest", label: "Latest mock" },
  { key: "last5", label: "Last 5 mocks" },
  { key: "last10", label: "Last 10 mocks" },
  { key: "specific", label: "Specific mock" },
];

function selectRangeMocks(mocks, rangeMode, specificMockId) {
  switch (rangeMode) {
    case "latest":
      return mocks.slice(-1);
    case "last5":
      return mocks.slice(-5);
    case "last10":
      return mocks.slice(-10);
    case "specific": {
      const match = mocks.find((mock) => mock.id === specificMockId);
      return match ? [match] : [];
    }
    case "all":
    default:
      return mocks;
  }
}

function headerNote(rangeMode, analysis, rangeMocks) {
  const count = analysis.analyzedMockCount;
  const unit = count === 1 ? "mock" : "mocks";
  if (rangeMode === "all") return `${count} analyzed ${unit}`;
  return `${count} analyzed of ${rangeMocks.length} selected`;
}

function rangeEmptyBody(rangeMode) {
  switch (rangeMode) {
    case "latest":
      return "The latest mock doesn't have analysis attached yet. Attach analysis details to it, or switch ranges above.";
    case "specific":
      return "This mock doesn't have analysis attached yet. Attach analysis details to it, or pick a different mock above.";
    case "last5":
    case "last10":
      return "None of the mocks in this range have analysis attached yet. Attach analysis details to a recent mock, or switch to All mocks.";
    default:
      return "Attach analysis details to a mock to unlock cross-mock mistake, skip, timing, and section-pattern insights.";
  }
}

function MockRangeSelector({ mocks, rangeMode, onRangeModeChange, specificMockId, onSpecificMockChange }) {
  const pickerMocks = useMemo(
    () => [...mocks].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))),
    [mocks]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mock range">
        {RANGE_OPTIONS.map((option) => {
          const active = rangeMode === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onRangeModeChange(option.key)}
              className="px-3 py-1.5 text-sm hover:opacity-90"
              style={{
                borderRadius: 8,
                border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                background: active ? COLORS.primary : COLORS.surface,
                color: active ? COLORS.onPrimary : COLORS.ink,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 650,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {rangeMode === "specific" && (
        <select
          value={specificMockId || ""}
          onChange={(ev) => onSpecificMockChange(ev.target.value)}
          style={{ ...selectStyle(false), fontFamily: "'Inter', sans-serif", minWidth: 220, width: "auto" }}
        >
          {pickerMocks.map((mock) => (
            <option key={mock.id} value={mock.id}>
              {fmtDate(mock.date)} - {mock.source}
              {mock.analysis ? "" : " (no analysis)"}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function analyzedRecentMocks(mocks, limit = 5) {
  return [...mocks]
    .filter((mock) => mock.analysis)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
    .slice(0, limit);
}

function buildRecentHighlights(mocks) {
  const recentMocks = analyzedRecentMocks(mocks);
  const questions = flattenAnalysisQuestions(recentMocks);
  const wrongReasons = {};
  const skippedReasons = {};
  const sectionWrong = {};

  questions.forEach((question) => {
    if (question.result === "Wrong") {
      inc(wrongReasons, question.outcomeReason);
      inc(sectionWrong, question.section);
    }
    if (question.result === "Skipped") inc(skippedReasons, question.outcomeReason);
  });

  const wrongCount = questions.filter((question) => question.result === "Wrong").length;
  const skippedCount = questions.filter((question) => question.result === "Skipped").length;
  const topWrong = topEntry(wrongReasons);
  const topSkipped = topEntry(skippedReasons);
  const topSectionWrong = topEntry(sectionWrong);

  return {
    recentMocks,
    questions,
    cards: [
      {
        label: "Recent mistake driver",
        value: topWrong?.label || "-",
        sub: topWrong ? `${topWrong.count}/${wrongCount} wrong questions in recent ${recentMocks.length} analyzed mocks (${fmtPct(topWrong.count / wrongCount)}).` : "No wrong-question reason signal yet.",
      },
      {
        label: "Recent skip driver",
        value: topSkipped?.label || "-",
        sub: topSkipped ? `${topSkipped.count}/${skippedCount} skipped questions in recent ${recentMocks.length} analyzed mocks (${fmtPct(topSkipped.count / skippedCount)}).` : "No skip reason signal yet.",
      },
      {
        label: "Section needing review",
        value: topSectionWrong?.label || "-",
        sub: topSectionWrong ? `${topSectionWrong.count} wrong questions came from ${topSectionWrong.label} recently.` : "No section-level mistake concentration yet.",
      },
    ],
  };
}

function RecentHighlights({ highlights }) {
  const range = highlights.recentMocks.length
    ? `${fmtDate(highlights.recentMocks[highlights.recentMocks.length - 1].date)} to ${fmtDate(highlights.recentMocks[0].date)}`
    : "";

  return (
    <Panel title="Recent 5 analyzed mocks" note={range}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {highlights.cards.map((card) => (
          <div key={card.label} className="p-4 flex flex-col gap-1.5" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
            <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>{card.label}</span>
            <strong style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16 }}>{card.value}</strong>
            <span className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>{card.sub}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function timingSummary(analysis) {
  if (!analysis.hasTimeData) return "Average seconds per question, by section and outcome.";
  const slowest = analysis.reasonRows.reduce(
    (worst, row) => (row.slowRate !== null && row.slowRate > (worst?.slowRate ?? -1) ? row : worst),
    null
  );
  return slowest?.slowRate
    ? `${slowest.section} has the highest slow-question rate at ${fmtPct(slowest.slowRate)}.`
    : "Average seconds per question, by section and outcome.";
}

function recentSummary(highlights) {
  const driver = highlights.cards[0];
  return driver && driver.value !== "-"
    ? `Recent mistake driver: ${driver.value}.`
    : "Last 5 analyzed mocks, compared against all-time patterns.";
}

export default function AnalysisInsightsDataTab({ mocks }) {
  const [rangeMode, setRangeMode] = useState("all");
  const [specificMockId, setSpecificMockId] = useState(null);

  const overallAnalyzedCount = useMemo(() => mocks.filter((mock) => mock.analysis).length, [mocks]);
  const latestMockId = mocks.length ? mocks[mocks.length - 1].id : null;
  const effectiveSpecificMockId = specificMockId && mocks.some((mock) => mock.id === specificMockId) ? specificMockId : latestMockId;

  const rangeMocks = useMemo(
    () => selectRangeMocks(mocks, rangeMode, effectiveSpecificMockId),
    [mocks, rangeMode, effectiveSpecificMockId]
  );

  const analysis = useMemo(() => buildDetailedAnalysisInsights(rangeMocks), [rangeMocks]);
  const advanced = useMemo(() => buildAdvancedInsights(rangeMocks), [rangeMocks]);
  const recentHighlights = useMemo(() => buildRecentHighlights(rangeMocks), [rangeMocks]);
  const topSignals = useMemo(() => buildTopSignals(analysis, advanced), [analysis, advanced]);

  const topSignalIds = useMemo(() => new Set(topSignals.map((signal) => signal.id)), [topSignals]);
  const sectionSetInsights = useMemo(
    () =>
      [...analysis.insights, ...advanced.setInsights]
        .filter((insight) => !topSignalIds.has(insight.id))
        .sort((a, b) => b.significance - a.significance),
    [analysis.insights, advanced.setInsights, topSignalIds]
  );
  const topicInsightsRemaining = useMemo(
    () => advanced.topicInsights.filter((insight) => !topSignalIds.has(insight.id)),
    [advanced.topicInsights, topSignalIds]
  );

  if (overallAnalyzedCount === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analysis data yet"
        body="Attach analysis details to a mock to unlock cross-mock mistake, skip, timing, and section-pattern insights."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Analysis Insights & Data" note={headerNote(rangeMode, analysis, rangeMocks)}>
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Aggregate view of detailed analysis data across mocks: mistake reasons, skip reasons, timing patterns, and section-wise signals.
        </p>
        <MockRangeSelector
          mocks={mocks}
          rangeMode={rangeMode}
          onRangeModeChange={setRangeMode}
          specificMockId={effectiveSpecificMockId}
          onSpecificMockChange={setSpecificMockId}
        />
      </Panel>

      {analysis.analyzedMockCount === 0 ? (
        <EmptyState icon={BarChart3} title="No analysis in this range" body={rangeEmptyBody(rangeMode)} />
      ) : (
        <>
          <GroupHeading>Top signals</GroupHeading>
          <TopSignals signals={topSignals} />

          <GroupHeading>Overall performance</GroupHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <DetailedStatCards analysis={analysis} />
            <AdvancedStatCards analysis={advanced} />
          </div>
          <ChartFrame title="Accuracy, wrong & skipped over time" note="Across analyzed mocks in this range">
            <AnalysisTrendChart rows={analysis.mockTrendRows} />
          </ChartFrame>

          <GroupHeading>Recommendations</GroupHeading>
          <ChartFrame
            title="Recommendations"
            note="Evidence-based next steps, tied to the pattern that triggered them"
            empty={advanced.recommendations.length === 0 ? "No actionable recommendations yet." : null}
          >
            <RecommendationList recommendations={advanced.recommendations} />
          </ChartFrame>

          <GroupHeading>Section & set insights</GroupHeading>
          <ChartFrame
            title="Section & set-level patterns"
            note="Ranked by impact"
            empty={sectionSetInsights.length === 0 ? "Analysis is attached, but there is not enough repeated signal beyond what's shown in Top Signals." : null}
          >
            <InsightList insights={sectionSetInsights} iconFor={detailedInsightIcon} showHero={false} />
          </ChartFrame>
          <ChartFrame title="Section reason breakdown" note="Accuracy, wrong/skip drivers, and timing by section">
            <SectionReasonTable rows={analysis.reasonRows} />
          </ChartFrame>

          <GroupHeading>Topic & Passage Domain insights</GroupHeading>
          <ChartFrame
            title="Topic & domain patterns"
            note="Guessing, concept gaps, timing, and trend by topic/domain"
            empty={topicInsightsRemaining.length === 0 ? "No strong topic/domain patterns yet — tag more questions and log a few more mocks." : null}
          >
            <InsightList insights={topicInsightsRemaining} showHero={false} />
          </ChartFrame>
          <ChartFrame title="Topic & domain accuracy breakdown" note="Every tagged topic and domain, weakest first">
            <TopicAccuracyTable rows={analysis.topicRows} />
          </ChartFrame>

          <GroupHeading>Explore deeper</GroupHeading>
          <Disclosure id="insights.timing" title="Timing & decision-making" summary={timingSummary(analysis)}>
            <div className="flex flex-col gap-4">
              <ChartFrame
                title="Timing by outcome"
                note="Average seconds per question"
                empty={!analysis.hasTimeData ? "We don't have time data yet — fill in Time Taken on any mock's analysis to unlock timing insights." : null}
              >
                <TimingTable rows={analysis.timingRows} />
              </ChartFrame>
              <ChartFrame title="Wrong, skipped, slow counts">
                <AnalysisBarChart rows={analysis.reasonRows} />
              </ChartFrame>
            </div>
          </Disclosure>
          {rangeMode === "all" && (
            <Disclosure id="insights.recent" title="Recent 5 mocks vs all-time" summary={recentSummary(recentHighlights)}>
              <RecentHighlights highlights={recentHighlights} />
            </Disclosure>
          )}
        </>
      )}
    </div>
  );
}
