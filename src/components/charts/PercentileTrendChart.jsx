import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { COLORS, SECTIONS, SECTION_META } from "../../constants";
import { fmtNum } from "../../lib/format";
import ChartFrame from "./ChartFrame";

/**
 * Percentile over time, per section plus overall.
 *
 * Marks aren't comparable across mocks from different sources — a 42 on an
 * easy paper and a 42 on a brutal one mean different things — but percentile
 * is already normalized against that paper's cohort, so this is the honest
 * "am I actually moving up?" view.
 *
 * The Y axis is auto-scaled rather than pinned to 0-100: percentiles cluster
 * in a narrow high band, and a fixed 0-100 axis flattens every real movement
 * into a straight line.
 */
export default function PercentileTrendChart({ data, targetPercentile }) {
  const empty = data.length === 0
    ? "Log a mock with its overall percentile to see this trend."
    : null;

  return (
    <ChartFrame
      title="Percentile trend"
      note="Overall and sectional percentiles from the test series you logged"
      empty={empty}
    >
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
              tickFormatter={(v) => `${v}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v, name) => [v === null ? "—" : `${fmtNum(v, 2)}%ile`, name]}
              cursor={{ stroke: COLORS.border, strokeWidth: 1 }}
              contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
              labelStyle={{ fontWeight: 600, color: COLORS.ink, marginBottom: 2 }}
            />
            {Number.isFinite(targetPercentile) && (
              <ReferenceLine
                y={targetPercentile}
                stroke={COLORS.primary}
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
                label={{ value: "Target", position: "insideTopRight", fill: COLORS.primary, fontSize: 11 }}
              />
            )}
            {SECTIONS.map((s) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={SECTION_META[s].color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
                name={s}
              />
            ))}
            {/* Overall is the headline number, so it's drawn heaviest and in
                ink rather than a section colour. */}
            <Line
              type="monotone"
              dataKey="Overall"
              stroke={COLORS.ink}
              strokeWidth={2.75}
              dot={{ r: 2.5, strokeWidth: 0, fill: COLORS.ink }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
              name="Overall"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="flex gap-4 text-xs mt-2 flex-wrap" style={{ fontFamily: "'Inter', sans-serif" }}>
          {SECTIONS.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: SECTION_META[s].color, display: "inline-block" }} />
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.ink, display: "inline-block" }} />
            Overall
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}
