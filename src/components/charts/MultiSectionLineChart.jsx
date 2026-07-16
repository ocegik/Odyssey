import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { COLORS, SECTIONS, SECTION_META } from "../../constants";
import SectionLegend from "./SectionLegend";

/**
 * Optional `targets` prop: { VARC: number|null, DILR: number|null, Quant: number|null }.
 * Draws one dashed ReferenceLine per section that has a target set — same
 * ReferenceLine pattern HardnessChart uses for its "Topper" line, just
 * per-section instead of a single fixed value, and colored to match each
 * section's line so multiple target lines stay distinguishable.
 */
export default function MultiSectionLineChart({ data, suffix = "", domain, targets, referenceLines = [] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fill: COLORS.inkMuted }}
            axisLine={{ stroke: COLORS.border }} tickLine={{ stroke: COLORS.border }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: COLORS.inkMuted }}
            axisLine={{ stroke: COLORS.border }} tickLine={{ stroke: COLORS.border }}
            tickFormatter={(v) => `${v}${suffix}`} domain={domain || ["auto", "auto"]} />
          <Tooltip formatter={(v) => (v === null ? "—" : `${v}${suffix}`)} cursor={{ stroke: COLORS.border, strokeWidth: 1 }}
            contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
            labelStyle={{ fontWeight: 600, color: COLORS.ink, marginBottom: 2 }} />
          {targets && SECTIONS.map((s) => (
            targets[s] !== null && targets[s] !== undefined && (
              <ReferenceLine key={`target-${s}`} y={targets[s]} stroke={SECTION_META[s].color} strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{ value: `${s} target`, position: "insideTopRight", fill: SECTION_META[s].color, fontSize: 10 }} />
            )
          ))}
          {referenceLines.map((line) => (
            line.value !== null && line.value !== undefined && (
              <ReferenceLine
                key={line.label}
                y={line.value}
                stroke={line.color || COLORS.inkMuted}
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
                label={{ value: line.label, position: "insideTopRight", fill: line.color || COLORS.inkMuted, fontSize: 11 }}
              />
            )
          ))}
          {SECTIONS.map((s) => (
            <Line key={s} type="monotone" dataKey={s} stroke={SECTION_META[s].color} strokeWidth={2.25}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls name={s} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <SectionLegend />
    </div>
  );
}
