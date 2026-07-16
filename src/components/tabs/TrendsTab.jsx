import { useMemo } from "react";
import ChartFrame from "../charts/ChartFrame";
import MultiSectionLineChart from "../charts/MultiSectionLineChart";
import AccuracyComparisonChart from "../charts/AccuracyComparisonChart";
import SectionRadarChart from "../charts/SectionRadarChart";
import HardnessChart from "../charts/HardnessChart";
import SourceComparisonChart from "../charts/SourceComparisonChart";
import StatCard from "../ui/StatCard";
import { COLORS, SECTIONS } from "../../constants";
import { buildRadarData, buildConsistencyStats } from "../../lib/compute";
import { fmtNum } from "../../lib/format";

function ConsistencyStats({ sectionStats }) {
  const consistency = useMemo(() => buildConsistencyStats(sectionStats), [sectionStats]);
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
              : "Log 3+ mocks in this section to see a consistency read"
          }
        />
      ))}
    </div>
  );
}

export default function TrendsTab({
  mocks,
  entriesWithComputed,
  marksSeries,
  attemptRateSeries,
  marksPerAttemptSeries,
  negMarksLostSeries,
  hardnessRatioSeries,
  sectionStats,
  settings,
}) {
  const noData = mocks.length === 0 ? "Log a few mocks to see the trend line." : null;
  const overallTargetMarks = settings?.overallTargetMarks;
  const targetLines = overallTargetMarks !== null && overallTargetMarks !== undefined
    ? [{ label: "Overall target", value: overallTargetMarks, color: COLORS.inkMuted }]
    : [];
  const radarData = useMemo(() => buildRadarData(sectionStats), [sectionStats]);
  const radarEmpty = SECTIONS.every((s) => !sectionStats[s]?.latest) ? "Log a few mocks to see section shape." : null;
  const hardnessHasData = hardnessRatioSeries.some((row) => SECTIONS.some((s) => row[s] !== null && row[s] !== undefined));

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Section-wise trend — total marks" note={targetLines.length ? "Dashed line is the Settings target score" : "Primary view for spotting who's lagging"} empty={noData}>
        <MultiSectionLineChart data={marksSeries} referenceLines={targetLines} />
      </ChartFrame>
      <AccuracyComparisonChart sectionStats={sectionStats} />
      <ChartFrame title="Attempt-rate trend" note="% of section questions attempted" empty={noData}>
        <MultiSectionLineChart data={attemptRateSeries} suffix="%" domain={[0, 100]} />
      </ChartFrame>

      <SectionRadarChart data={radarData} empty={radarEmpty} />

      <ChartFrame title="Marks-per-attempt trend" note="Marks scored per question attempted" empty={noData}>
        <MultiSectionLineChart data={marksPerAttemptSeries} />
      </ChartFrame>

      <ChartFrame title="Marks lost to negative marking" note="Marks given up to wrong MCQ attempts, per mock" empty={noData}>
        <MultiSectionLineChart data={negMarksLostSeries} />
      </ChartFrame>

      <HardnessChart data={hardnessRatioSeries} empty={!hardnessHasData ? "Log a topper score with a mock to see this indicator." : null} />

      <ConsistencyStats sectionStats={sectionStats} />

      <SourceComparisonChart entriesWithComputed={entriesWithComputed} />
    </div>
  );
}
