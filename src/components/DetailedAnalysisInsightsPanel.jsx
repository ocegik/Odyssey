import { AlertTriangle, Clock3, Target } from "lucide-react";
import { Bar, BarChart, ComposedChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, TYPE } from "../constants";
import { fmtDate, fmtNum, fmtPct } from "../lib/format";
import StatCard from "./ui/StatCard";
import SectionBadge from "./ui/SectionBadge";

function seconds(value) {
  return value === null || value === undefined ? "-" : `${fmtNum(value, 0)}s`;
}

export function detailedInsightIcon(insight) {
  if (insight.title.includes("Time")) return Clock3;
  if (insight.title.includes("Question")) return Target;
  return AlertTriangle;
}

/* Stacks the top-3 reasons (not just the single top one) so this table fully
   subsumes what a separate "top reasons per section" card would show —
   the same fact should live in one place, at its fullest detail, not be
   split between a table's top-1 and a card's top-3 elsewhere on the page. */
function ReasonList({ entries, total }) {
  if (!entries || entries.length === 0) return <span style={{ color: COLORS.inkMuted }}>-</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {entries.slice(0, 3).map((entry) => (
        <span key={entry.label} className="text-xs whitespace-nowrap">
          {entry.label} <span style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>({entry.count}/{total})</span>
        </span>
      ))}
    </div>
  );
}

export function SectionReasonTable({ rows }) {
  return (
    <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
            {["Section", "Accuracy", "Wrong drivers", "Skip drivers", "Slow", "Avg time"].map((label) => (
              <th key={label} className="text-left px-3 py-2" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.section} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td className="px-3 py-2"><SectionBadge section={row.section} size="sm" /></td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtPct(row.accuracy)}</td>
              <td className="px-3 py-2"><ReasonList entries={row.wrongReasons} total={row.wrong} /></td>
              <td className="px-3 py-2"><ReasonList entries={row.skippedReasons} total={row.skipped} /></td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtPct(row.slowRate)}</td>
              <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seconds(row.avgTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimingTable({ rows }) {
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

export function AnalysisTrendChart({ rows }) {
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
          <Bar yAxisId="count" dataKey="Skipped" fill={COLORS.warn} radius={[4, 4, 0, 0]} />
          <Line yAxisId="pct" type="monotone" dataKey="Accuracy" stroke={COLORS.ink} strokeWidth={2.25} dot={{ r: 3, strokeWidth: 0, fill: COLORS.ink }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopicAccuracyTable({ rows }) {
  const tagged = rows.filter((row) => row.attempted > 0);
  if (tagged.length === 0) {
    return <p className="text-sm" style={{ color: COLORS.inkMuted }}>Tag topics and passage domains in Mock Analysis to unlock an accuracy breakdown.</p>;
  }
  return (
    <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
            {["Section", "Topic / Domain", "Accuracy", "Correct/Attempted"].map((label) => (
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

export function AnalysisBarChart({ rows }) {
  const data = rows.map((row) => ({
    section: row.section,
    Wrong: row.wrong,
    Skipped: row.skipped,
    Slow: row.slow || 0,
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
          <Bar dataKey="Skipped" fill={COLORS.warn} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Slow" fill={COLORS.info} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DetailedStatCards({ analysis }) {
  return (
    <>
      <StatCard label="Analyzed mocks" value={analysis.analyzedMockCount} />
      <StatCard label="Questions" value={analysis.questionCount} />
      <StatCard label="Analysis acc" value={fmtPct(analysis.accuracy)} />
      <StatCard label="Wrong" value={analysis.wrong} />
      <StatCard label="Skipped" value={analysis.skipped} />
    </>
  );
}
