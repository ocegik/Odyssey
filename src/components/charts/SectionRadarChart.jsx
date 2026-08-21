import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { COLORS, SECTIONS, SECTION_META } from "../../constants";
import ChartFrame from "./ChartFrame";
import { createChartShareImage, shareSeries } from "../../lib/shareImage";
import ShareImageButton from "../ui/ShareImageButton";

export default function SectionRadarChart({ data, empty, studentName }) {
  return (
    <ChartFrame title="Section profile" note="Accuracy, attempt rate, and marks per attempt, shown on a 0–100 scale" action={<ShareImageButton createImage={() => createChartShareImage({ title: "Section Profile", studentName, subtitle: "Accuracy, attempt rate and marks per attempt", data: data.map((row) => ({ ...row, label: row.metric })), series: [shareSeries.VARC, shareSeries.DILR, shareSeries.Quant], chartType: "bar", domain: [0, 100], filename: "odyssey-section-profile.png" })} />} empty={empty}>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <RadarChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <PolarGrid stroke={COLORS.border} />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fill: COLORS.inkMuted }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={5}
              tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fill: COLORS.inkMuted }} axisLine={false} />
            <Tooltip formatter={(v) => (v === null || v === undefined ? "—" : v)} cursor={{ stroke: COLORS.border, strokeWidth: 1 }}
              contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
              labelStyle={{ fontWeight: 600, color: COLORS.ink, marginBottom: 2 }} />
            <Legend wrapperStyle={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }} />
            {SECTIONS.map((s) => (
              <Radar key={s} dataKey={s} name={s} stroke={SECTION_META[s].color} fill={SECTION_META[s].color}
                fillOpacity={0.18} strokeWidth={2.25} connectNulls />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
