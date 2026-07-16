import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS } from "../../constants";
import { fmtDate, fmtNum } from "../../lib/format";
import { computePacing } from "../../lib/compute";
import StatCard from "../ui/StatCard";
import ChartFrame from "../charts/ChartFrame";
import CollegeTargetsPanel from "../CollegeTargetsPanel";
import WeakestSectionCard from "../charts/WeakestSectionCard";
import InsightCard from "../charts/InsightCard";

const MS_PER_DAY = 86400000;

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function parseDate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(iso) {
  const date = parseDate(iso);
  if (!date) return null;
  return Math.ceil((date.getTime() - startOfToday().getTime()) / MS_PER_DAY);
}

function nextScheduledMock(schedule = []) {
  const today = startOfToday();
  return [...schedule]
    .filter((entry) => {
      const date = parseDate(entry.date);
      return date && date >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

function mockOverallPercentile(mock) {
  if (!mock) return null;
  const analysisPercentile = mock.analysis?.overallPercentile;
  if (analysisPercentile !== null && analysisPercentile !== undefined) return analysisPercentile;

  const sectionPercentiles = ["VARC", "DILR", "Quant"]
    .map((section) => mock[section]?.percentile)
    .filter((value) => value !== null && value !== undefined);
  if (sectionPercentiles.length === 0) return null;
  return sectionPercentiles.reduce((sum, value) => sum + value, 0) / sectionPercentiles.length;
}

function mockTotalMarks(mock) {
  if (mock.manualTotalMarks !== null && mock.manualTotalMarks !== undefined) return mock.manualTotalMarks;
  return ["VARC", "DILR", "Quant"].reduce((sum, section) => {
    const marks = mock[section]?.totalMarks;
    return Number.isFinite(marks) ? sum + marks : sum;
  }, 0);
}

function buildOverallMarksData(mocks) {
  return mocks.map((mock) => ({
    label: `${fmtDate(mock.date)} - ${mock.source}`,
    marks: mockTotalMarks(mock),
  }));
}

function emptyInsightText(mocks) {
  if (mocks.length === 0) return "Log a mock to start seeing prep signals here.";
  if (mocks.length < 3) return "A few more mocks will make the first meaningful trend easier to read.";
  return "No major swing stands out in the latest data. Keep logging mocks to sharpen the signal.";
}

function OverallMarksChart({ data }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fill: COLORS.inkMuted }}
            axisLine={{ stroke: COLORS.border }}
            tickLine={{ stroke: COLORS.border }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: COLORS.inkMuted }}
            axisLine={{ stroke: COLORS.border }}
            tickLine={{ stroke: COLORS.border }}
            tickFormatter={(value) => fmtNum(value, 0)}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value) => [fmtNum(value, 1), "Marks"]}
            cursor={{ stroke: COLORS.border, strokeWidth: 1 }}
            contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
            labelStyle={{ fontWeight: 600, color: COLORS.ink, marginBottom: 2 }}
          />
          <Line
            type="monotone"
            dataKey="marks"
            stroke={COLORS.ink}
            strokeWidth={2.4}
            dot={{ r: 3, strokeWidth: 0, fill: COLORS.ink }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            name="Overall marks"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OverviewTab({ mocks, insights, weakestAnalysis, settings }) {
  const nextMock = nextScheduledMock(settings?.mockSchedule);
  const catDaysLeft = daysUntil(settings?.catTargetDate);
  const graphData = buildOverallMarksData(mocks);
  const latestMock = mocks.length > 0 ? mocks[mocks.length - 1] : null;
  const currentPercentile = mockOverallPercentile(latestMock);
  const pacing = computePacing(mocks, settings?.catTargetDate);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Mocks logged" value={mocks.length} />
        <StatCard
          label="Next mock exam"
          value={nextMock ? fmtDate(nextMock.date) : "-"}
          sub={nextMock ? `${nextMock.examName} - target ${fmtNum(nextMock.targetMarks, 0)}` : "Add a mock schedule in Settings"}
        />
        <StatCard
          label="Days left until CAT"
          value={catDaysLeft === null || catDaysLeft < 0 ? "-" : catDaysLeft}
          sub={catDaysLeft === null ? "Set the CAT date in Settings" : catDaysLeft < 0 ? "Target date has passed" : settings.catTargetDate}
        />
        <StatCard
          label="Recent pace"
          value={pacing ? `${fmtNum(pacing.recentPerWeek, 1)}/wk` : "-"}
          sub={pacing ? pacing.note : "Set the CAT date in Settings to see a pacing read"}
        />
      </div>

      <ChartFrame title="Insights" note="Latest signals from your rolling stats" empty={insights.length === 0 ? emptyInsightText(mocks) : null}>
        <div className="flex flex-col gap-2">
          {insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}
        </div>
      </ChartFrame>

      <WeakestSectionCard analysis={weakestAnalysis} />

      <ChartFrame
        title="Overall marks by mock"
        empty={graphData.length === 0 ? "Log a mock to see overall marks across dates." : null}
      >
        <OverallMarksChart data={graphData} />
      </ChartFrame>

      <CollegeTargetsPanel currentPercentile={currentPercentile} />
    </div>
  );
}
