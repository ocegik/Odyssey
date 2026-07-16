import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { COLORS, SECTIONS, SECTION_META } from "../../constants";
import ChartFrame from "./ChartFrame";

export default function SourceComparisonChart({ entriesWithComputed }) {
  const data = useMemo(() => {
    const bySource = {};
    entriesWithComputed.forEach((e) => {
      bySource[e.source] = bySource[e.source] || { source: e.source, VARC: [], DILR: [], Quant: [] };
      bySource[e.source][e.section].push(e.totalMarks);
    });
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    return Object.values(bySource).map((s) => ({ source: s.source, VARC: avg(s.VARC), DILR: avg(s.DILR), Quant: avg(s.Quant) }));
  }, [entriesWithComputed]);

  return (
    <ChartFrame title="Source-wise comparison" note="Avg. total marks per section" empty={data.length === 0 ? "Log mocks from more than one source to compare difficulty." : null}>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="source" tick={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fill: COLORS.ink }}
              axisLine={{ stroke: COLORS.border }} tickLine={{ stroke: COLORS.border }} />
            <YAxis tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: COLORS.inkMuted }}
              axisLine={{ stroke: COLORS.border }} tickLine={{ stroke: COLORS.border }} />
            <Tooltip cursor={{ fill: COLORS.surface2 }}
              contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
              labelStyle={{ fontWeight: 600, color: COLORS.ink, marginBottom: 2 }} />
            <Legend wrapperStyle={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }} />
            {SECTIONS.map((s) => <Bar key={s} dataKey={s} fill={SECTION_META[s].color} radius={[4, 4, 0, 0]} maxBarSize={40} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
