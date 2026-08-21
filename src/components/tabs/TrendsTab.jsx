import { useMemo } from "react";
import ChartFrame from "../charts/ChartFrame";
import MultiSectionLineChart from "../charts/MultiSectionLineChart";
import AccuracyComparisonChart from "../charts/AccuracyComparisonChart";
import SectionRadarChart from "../charts/SectionRadarChart";
import PercentileTrendChart from "../charts/PercentileTrendChart";
import SourceComparisonChart from "../charts/SourceComparisonChart";
import ScoreLeakPanel, { LEAK_WINDOW, scoreLeakSummary } from "../ScoreLeakPanel";
import StatCard from "../ui/StatCard";
import GroupHeading from "../ui/GroupHeading";
import Disclosure from "../ui/Disclosure";
import { COLORS, SECTIONS } from "../../constants";
import { buildRadarData, buildConsistencyStats } from "../../lib/compute";
import { aggregateScoreLeak } from "../../lib/scoreLeak";
import { fmtNum } from "../../lib/format";

function ConsistencyStats({ consistency }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {consistency.map((row) => (
        <StatCard
          key={row.section}
          label={`${row.section} consistency`}
          value={row.accuracyStdDev !== null ? `±${fmtNum(row.accuracyStdDev * 100, 1)}%` : "-"}
          sub={
            row.accuracyStdDev !== null
              ? `Accuracy swing across ${row.sampleSize} mocks · ±${fmtNum(row.marksStdDev, 1)} marks`
              : "Log at least 3 mocks in this section to calculate consistency"
          }
        />
      ))}
    </div>
  );
}

/* Summary lines for the collapsed disclosures. Each one has to be worth
   reading on its own — a collapsed row that just says "Advanced" gives no
   reason to open it, while a real number does. */
function consistencySummary(consistency) {
  const rated = consistency.filter((row) => row.accuracyStdDev !== null);
  if (rated.length === 0) return "At least 3 mocks per section are needed";
  const swingiest = rated.reduce((worst, row) => (row.accuracyStdDev > worst.accuracyStdDev ? row : worst));
  return `Most volatile: ${swingiest.section} ±${fmtNum(swingiest.accuracyStdDev * 100, 1)}% accuracy`;
}

function percentileSummary(percentileSeries) {
  const withOverall = percentileSeries.filter((row) => row.Overall !== null);
  if (withOverall.length === 0) return "No percentiles logged yet";
  const latest = withOverall[withOverall.length - 1];
  if (withOverall.length === 1) return `Latest ${fmtNum(latest.Overall, 2)}%ile`;
  const prev = withOverall[withOverall.length - 2];
  const delta = latest.Overall - prev.Overall;
  return `Latest ${fmtNum(latest.Overall, 2)}%ile (${delta >= 0 ? "+" : ""}${fmtNum(delta, 2)} vs previous)`;
}

function radarSummary(sectionStats) {
  const logged = SECTIONS.filter((s) => sectionStats[s]?.latest);
  if (logged.length === 0) return "Log a few mocks";
  return `Comparing ${logged.join(" · ")} on accuracy, attempt rate and efficiency`;
}

export default function TrendsTab({
  mocks,
  entriesWithComputed,
  marksSeries,
  attemptRateSeries,
  marksPerAttemptSeries,
  percentileSeries,
  sectionStats,
  settings,
}) {
  const noData = mocks.length === 0 ? "Log scored mocks to build a trend line." : null;
  const overallTargetMarks = settings?.overallTargetMarks;
  const targetLines = overallTargetMarks !== null && overallTargetMarks !== undefined
    ? [{ label: "Overall target", value: overallTargetMarks, color: COLORS.inkMuted }]
    : [];
  const sectionTargets = settings?.sectionTargetMarks || {};
  const hasSectionTargets = SECTIONS.some((s) => sectionTargets[s] !== null && sectionTargets[s] !== undefined);
  const marksTrendNote = hasSectionTargets
    ? "Dashed lines are per-section Account targets"
    : targetLines.length
      ? "Dashed line is the Account target score"
      : "Compare how each section is moving over time";

  const radarData = useMemo(() => buildRadarData(sectionStats), [sectionStats]);
  const radarEmpty = SECTIONS.every((s) => !sectionStats[s]?.latest) ? "Log scored mocks to build a section profile." : null;
  const consistency = useMemo(() => buildConsistencyStats(sectionStats), [sectionStats]);
  const leak = useMemo(() => aggregateScoreLeak(entriesWithComputed, LEAK_WINDOW), [entriesWithComputed]);

  return (
    <div className="flex flex-col gap-4">
      {/* Always-on: the three charts that answer "who's lagging, and is it
          accuracy or attempts" — the question the app exists for. */}
      <GroupHeading>Core trends</GroupHeading>
      <ChartFrame title="Section-wise trend — total marks" note={marksTrendNote} empty={noData}>
        <MultiSectionLineChart data={marksSeries} referenceLines={targetLines} targets={sectionTargets} />
      </ChartFrame>
      <AccuracyComparisonChart sectionStats={sectionStats} />
      <ChartFrame title="Attempt-rate trend" note="% of section questions attempted" empty={noData}>
        <MultiSectionLineChart data={attemptRateSeries} suffix="%" domain={[0, 100]} />
      </ChartFrame>

      {/* Everything below is depth: collapsed until asked for, then
          remembered per device. See hooks/useDisclosure. */}
      <GroupHeading>Go deeper</GroupHeading>

      <Disclosure id="trends.leak" title="Where marks are being lost" summary={scoreLeakSummary(leak)}>
        <ScoreLeakPanel leak={leak} />
        <div className="mt-4">
          <ChartFrame title="Marks-per-attempt trend" note="Marks scored per question attempted" empty={noData}>
            <MultiSectionLineChart data={marksPerAttemptSeries} />
          </ChartFrame>
        </div>
      </Disclosure>

      <Disclosure id="trends.percentile" title="Percentile trend" summary={percentileSummary(percentileSeries)}>
        <div className="flex flex-col gap-4 pt-4">
          <PercentileTrendChart data={percentileSeries} targetPercentile={settings?.overallTargetPercentile} />
        </div>
      </Disclosure>

      <Disclosure id="trends.shape" title="Section shape" summary={radarSummary(sectionStats)}>
        <div className="pt-4">
          <SectionRadarChart data={radarData} empty={radarEmpty} />
        </div>
      </Disclosure>

      <Disclosure id="trends.consistency" title="Consistency & sources" summary={consistencySummary(consistency)}>
        <div className="flex flex-col gap-4 pt-4">
          <ConsistencyStats consistency={consistency} />
          <SourceComparisonChart entriesWithComputed={entriesWithComputed} />
        </div>
      </Disclosure>
    </div>
  );
}
