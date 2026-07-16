import ChartFrame from "../charts/ChartFrame";
import MultiSectionLineChart from "../charts/MultiSectionLineChart";
import AccuracyComparisonChart from "../charts/AccuracyComparisonChart";
import { COLORS } from "../../constants";

export default function TrendsTab({ mocks, marksSeries, attemptRateSeries, sectionStats, settings }) {
  const noData = mocks.length === 0 ? "Log a few mocks to see the trend line." : null;
  const overallTargetMarks = settings?.overallTargetMarks;
  const targetLines = overallTargetMarks !== null && overallTargetMarks !== undefined
    ? [{ label: "Overall target", value: overallTargetMarks, color: COLORS.inkMuted }]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Section-wise trend — total marks" note={targetLines.length ? "Dashed line is the Settings target score" : "Primary view for spotting who's lagging"} empty={noData}>
        <MultiSectionLineChart data={marksSeries} referenceLines={targetLines} />
      </ChartFrame>
      <AccuracyComparisonChart sectionStats={sectionStats} />
      <ChartFrame title="Attempt-rate trend" note="% of section questions attempted" empty={noData}>
        <MultiSectionLineChart data={attemptRateSeries} suffix="%" domain={[0, 100]} />
      </ChartFrame>
    </div>
  );
}
