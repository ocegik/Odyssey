import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS } from "../../constants";
import { fmtNum } from "../../lib/format";

/* Lives in its own module so Overview can lazy-load it: recharts is by far
   the biggest dependency in the app, and pulling it into the initial bundle
   just to draw one line delays every number above it. */
export default function OverallMarksChart({ data }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickFormatter={(value) => value.split(" - ")[0]}
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
