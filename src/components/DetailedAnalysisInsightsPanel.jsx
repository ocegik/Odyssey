import { AlertTriangle, Clock3, Target } from "lucide-react";
import { Bar, BarChart, ComposedChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, SECTION_META, TYPE } from "../constants";
import { fmtDate, fmtNum, fmtPct } from "../lib/format";
import ChartFrame from "./charts/ChartFrame";
import SectionBadge from "./ui/SectionBadge";
import StatCard from "./ui/StatCard";

function seconds(value) {
  return value === null || value === undefined ? "-" : `${fmtNum(value, 0)}s`;
}

function ReasonLabel({ entry, total }) {
  if (!entry) return <span style={{ color: COLORS.inkMuted }}>-</span>;
  return (
    <span>
      {entry.label} <span style={{ color: COLORS.inkMuted }}>({entry.count}/{total})</span>
    </span>
  );
}

function DetailedInsightCard({ insight }) {
  const meta = SECTION_META[insight.section];
  const Icon = insight.title.includes("Time") ? Clock3 : insight.title.includes("Question") ? Target : AlertTriangle;
  return (
    <div className="p-3 flex flex-col gap-1.5" style={{ background: meta.soft, borderLeft: `3px solid ${meta.color}`, borderRadius: 8 }}>
      <div className="flex items-center gap-2">
        <Icon size={14} color={COLORS.danger} strokeWidth={2.25} />
        <SectionBadge section={insight.section} size="sm" />
        <span className="text-xs" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{insight.title}</span>
      </div>
      <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.45 }}>{insight.text}</p>
    </div>
  );
}

function SectionReasonTable({ rows }) {
  return (
    <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
            {["Section", "Accuracy", "Correct signal", "Wrong driver", "Skip driver", "Slow", "Avg time"].map((label) => (
              <th key={label} className="text-left px-3 py-2" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.section} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td className="px-3 py-2"><SectionBadge section={row.section} size="sm" /></td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtPct(row.accuracy)}</td>
              <td className="px-3 py-2"><ReasonLabel entry={row.topCorrect} total={row.correct} /></td>
              <td className="px-3 py-2"><ReasonLabel entry={row.topWrong} total={row.wrong} /></td>
              <td className="px-3 py-2"><ReasonLabel entry={row.topSkipped} total={row.skipped} /></td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtPct(row.slowRate)}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seconds(row.avgTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimingTable({ rows }) {
  return (
    <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
            {["Section", "Correct avg", "Wrong avg", "Skipped avg", "Wrong delta"].map((label) => (
              <th key={label} className="text-left px-3 py-2" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.section} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td className="px-3 py-2"><SectionBadge section={row.section} size="sm" /></td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seconds(row.byResult.Correct.avgTime)}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seconds(row.byResult.Wrong.avgTime)}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seconds(row.byResult.Skipped.avgTime)}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seconds(row.byResult.Wrong.avgDelta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisTrendChart({ rows }) {
  const data = rows.map((row) => ({
    label: `${fmtDate(row.date)} - ${row.source}`,
    Accuracy: row.accuracy !== null && row.accuracy !== undefined ? +(row.accuracy * 100).toFixed(1) : null,
    Wrong: row.wrong,
    Skipped: row.skipped,
  }));
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: COLORS.inkMuted, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="count" tick={{ fill: COLORS.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis yAxisId="pct" orientation="right" tick={{ fill: COLORS.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            cursor={{ fill: COLORS.hover }}
            contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
          />
          <Legend wrapperStyle={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }} />
          <Bar yAxisId="count" dataKey="Wrong" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
          <Bar yAxisId="count" dataKey="Skipped" fill={COLORS.quant} radius={[4, 4, 0, 0]} />
          <Line yAxisId="pct" type="monotone" dataKey="Accuracy" stroke={COLORS.ink} strokeWidth={2.25} dot={{ r: 3, strokeWidth: 0, fill: COLORS.ink }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopicAccuracyTable({ rows }) {
  const tagged = rows.filter((row) => row.attempted > 0);
  if (tagged.length === 0) {
    return <p className="text-sm" style={{ color: COLORS.inkMuted }}>Tag topics in Mock Analysis to unlock a per-topic accuracy breakdown.</p>;
  }
  return (
    <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
            {["Section", "Topic", "Accuracy", "Correct/Attempted"].map((label) => (
              <th key={label} className="text-left px-3 py-2" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tagged.map((row) => (
            <tr key={`${row.section}-${row.topic}`} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td className="px-3 py-2"><SectionBadge section={row.section} size="sm" /></td>
              <td className="px-3 py-2">{row.topic}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtPct(row.accuracy)}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.correct}/{row.attempted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisBarChart({ rows }) {
  const data = rows.map((row) => ({
    section: row.section,
    Wrong: row.wrong,
    Skipped: row.skipped,
    Slow: Math.round((row.slowRate || 0) * row.total),
  }));
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="section" tick={{ fill: COLORS.inkMuted, fontSize: 12 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
          <YAxis tick={{ fill: COLORS.inkMuted, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: COLORS.hover }}
            contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
          />
          <Bar dataKey="Wrong" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Skipped" fill={COLORS.quant} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Slow" fill={COLORS.dilr} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DetailedAnalysisInsightsPanel({ analysis }) {
  const empty = analysis.analyzedMockCount === 0
    ? "Attach detailed analysis to any mock to unlock reason, timing, and recurring-pattern insights."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Analyzed mocks" value={analysis.analyzedMockCount} />
        <StatCard label="Questions" value={analysis.questionCount} />
        <StatCard label="Analysis acc" value={fmtPct(analysis.accuracy)} />
        <StatCard label="Wrong" value={analysis.wrong} />
        <StatCard label="Skipped" value={analysis.skipped} />
      </div>

      <ChartFrame title="Detailed analysis insights" note="Outcome reasons, timing, and recurring patterns" empty={empty}>
        <div className="flex flex-col gap-2">
          {analysis.insights.length > 0 ? (
            analysis.insights.map((insight) => <DetailedInsightCard key={insight.id} insight={insight} />)
          ) : (
            <p className="text-sm" style={{ color: COLORS.inkMuted }}>Analysis is attached, but there is not enough repeated signal yet.</p>
          )}
        </div>
      </ChartFrame>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartFrame title="Wrong, skipped, slow counts" empty={empty}>
          <AnalysisBarChart rows={analysis.reasonRows} />
        </ChartFrame>
        <ChartFrame title="Section reason breakdown" empty={empty}>
          <SectionReasonTable rows={analysis.reasonRows} />
        </ChartFrame>
      </div>

      <ChartFrame title="Timing by outcome" note="Average seconds per question" empty={empty}>
        <TimingTable rows={analysis.timingRows} />
      </ChartFrame>

      <ChartFrame title="Accuracy, wrong & skipped over time" note="Across analyzed mocks" empty={empty}>
        <AnalysisTrendChart rows={analysis.mockTrendRows} />
      </ChartFrame>

      <ChartFrame title="Topic accuracy breakdown" note="Every tagged topic, weakest first" empty={empty}>
        <TopicAccuracyTable rows={analysis.topicRows} />
      </ChartFrame>
    </div>
  );
}
