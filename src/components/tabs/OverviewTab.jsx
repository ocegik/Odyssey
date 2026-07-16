import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Lightbulb } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../../constants";
import { fmtDate, fmtNum } from "../../lib/format";
import StatCard from "../ui/StatCard";
import ChartFrame from "../charts/ChartFrame";
import CollegeTargetsPanel from "../CollegeTargetsPanel";

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

function insightText(insights, mocks) {
  if (insights?.[0]?.text) return insights[0].text;
  if (mocks.length === 0) return "Log a mock to start seeing prep signals here.";
  if (mocks.length < 3) return "A few more mocks will make the first meaningful trend easier to read.";
  return "No major swing stands out in the latest data. Keep logging mocks to sharpen the signal.";
}

function InsightTile({ text }) {
  return (
    <div
      className="p-4 flex items-start gap-3"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
    >
      <div
        className="shrink-0 inline-flex items-center justify-center"
        style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.surface2, color: COLORS.ink }}
      >
        <Lightbulb size={17} />
      </div>
      <div className="flex flex-col gap-1">
        <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Recent insight</span>
        <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{text}</p>
      </div>
    </div>
  );
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

export default function OverviewTab({ mocks, insights, settings }) {
  const nextMock = nextScheduledMock(settings?.mockSchedule);
  const catDaysLeft = daysUntil(settings?.catTargetDate);
  const graphData = buildOverallMarksData(mocks);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>

      <InsightTile text={insightText(insights, mocks)} />

      <ChartFrame
        title="Overall marks by mock"
        empty={graphData.length === 0 ? "Log a mock to see overall marks across dates." : null}
      >
        <OverallMarksChart data={graphData} />
      </ChartFrame>

      <CollegeTargetsPanel targetPercentile={settings?.overallTargetPercentile ?? null} />
    </div>
  );
}
