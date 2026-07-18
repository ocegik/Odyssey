import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS, SECTIONS, SHADOW, TYPE } from "../../constants";
import { fmtDate, fmtNum, fmtPct } from "../../lib/format";
import { computePacing, mockTotalMarks, computeAdaptiveTarget } from "../../lib/compute";
import StatCard from "../ui/StatCard";
import SectionBadge from "../ui/SectionBadge";
import ChartFrame from "../charts/ChartFrame";
import CollegeTargetsPanel from "../CollegeTargetsPanel";
import WeakestSectionCard from "../charts/WeakestSectionCard";
import InsightList from "../charts/InsightList";

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

// Days of slack left between the chosen attempt day and the window close —
// only meaningful for "range" entries; "flexible" has no close date to count down to.
function slackDays(entry) {
  if (!entry || entry.dateType !== "range" || !entry.windowEnd) return null;
  const end = parseDate(entry.windowEnd);
  const chosen = parseDate(entry.date);
  if (!end || !chosen) return null;
  return Math.max(0, Math.round((end.getTime() - chosen.getTime()) / MS_PER_DAY));
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

/* The one thing a user opening the app actually wants first: how did the
   last mock go, and how does it compare to the one before it. Kept as its
   own card, above the fold, ahead of the rolling-signal insights below. */
function LatestMockSpotlight({ mocks }) {
  if (mocks.length === 0) return null;
  const latest = mocks[mocks.length - 1];
  const prev = mocks.length > 1 ? mocks[mocks.length - 2] : null;
  const marks = mockTotalMarks(latest);
  const prevMarks = prev ? mockTotalMarks(prev) : null;
  const delta = prevMarks !== null ? marks - prevMarks : null;
  const percentile = mockOverallPercentile(latest);

  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 style={TYPE.chartTitle}>Latest mock</h3>
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
            <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Percentile</span>
            <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: COLORS.ink }}>{fmtNum(percentile, 2)}%ile</strong>
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

export default function OverviewTab({ mocks, insights, weakestAnalysis, settings }) {
  const nextMock = nextScheduledMock(settings?.mockSchedule);
  const nextMockSlack = slackDays(nextMock);
  const catDaysLeft = daysUntil(settings?.catTargetDate);
  const graphData = buildOverallMarksData(mocks);
  const latestMock = mocks.length > 0 ? mocks[mocks.length - 1] : null;
  const currentPercentile = mockOverallPercentile(latestMock);
  const pacing = computePacing(mocks, settings?.catTargetDate);
  const lastMarks = latestMock ? mockTotalMarks(latestMock) : null;
  const nextTargetMarks = computeAdaptiveTarget(lastMarks, settings?.overallTargetMarks);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Mocks logged" value={mocks.length} />
        <StatCard
          label="Next mock exam"
          value={nextMock ? fmtDate(nextMock.date) : "-"}
          sub={
            nextMock
              ? `${nextMock.examName} - target ${fmtNum(nextTargetMarks, 0)} (auto)` +
                (nextMockSlack !== null ? ` · ${nextMockSlack}d slack` : nextMock.dateType === "flexible" ? " · flexible" : "")
              : "Add a mock schedule in Settings"
          }
        />
        <StatCard
          label="Days left until CAT"
          value={catDaysLeft === null || catDaysLeft < 0 ? "-" : catDaysLeft}
          sub={catDaysLeft === null ? "Set the CAT date in Settings" : catDaysLeft < 0 ? "Exam date has passed" : settings.catTargetDate}
        />
        <StatCard
          label="Recent pace"
          value={pacing ? `${fmtNum(pacing.recentPerWeek, 1)}/wk` : "-"}
          sub={pacing ? pacing.note : "Set the CAT date in Settings to see a pacing read"}
        />
      </div>

      <LatestMockSpotlight mocks={mocks} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <ChartFrame title="Insights" note="Latest signals from your rolling stats" empty={insights.length === 0 ? emptyInsightText(mocks) : null}>
          <InsightList insights={insights} />
        </ChartFrame>

        <WeakestSectionCard analysis={weakestAnalysis} />
      </div>

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
