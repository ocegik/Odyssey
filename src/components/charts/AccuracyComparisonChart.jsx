import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { COLORS, SECTIONS } from "../../constants";
import ChartFrame from "./ChartFrame";
import { createChartShareImage, shareSeries } from "../../lib/shareImage";
import ShareImageButton from "../ui/ShareImageButton";

export default function AccuracyComparisonChart({ sectionStats, studentName }) {
  const [mode, setMode] = useState("latest");
  const data = SECTIONS.map((sec) => {
    const latest = sectionStats[sec].latest;
    if (!latest) return { section: sec, Overall: null };
    const accuracy = mode === "latest" ? latest.overallAccuracy : latest.rollAccuracy;
    return {
      section: sec,
      Overall: accuracy !== null ? +(accuracy * 100).toFixed(1) : null,
    };
  });
  const hasAny = data.some((d) => d.Overall !== null);

  return (
    <ChartFrame
      title="Accuracy comparison"
      action={hasAny && <ShareImageButton createImage={() => createChartShareImage({ title: "Accuracy Comparison", studentName, subtitle: mode === "latest" ? "Latest mock" : "Rolling average (5)", data, series: [{ ...shareSeries.Overall, key: "Overall", label: "Accuracy" }], chartType: "bar", domain: [0, 100], suffix: "%", filename: "odyssey-accuracy-comparison.png" })} />}
      note={
        <div className="flex gap-1">
          {["latest", "rolling"].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2 py-1 text-xs ${mode === m ? "" : "hover:bg-black/5"}`}
              style={{ borderRadius: 6, background: mode === m ? COLORS.primary : "transparent", color: mode === m ? COLORS.onPrimary : COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
              {m === "latest" ? "Latest mock" : "Rolling avg (5)"}
            </button>
          ))}
        </div>
      }
      empty={!hasAny ? "Log attempt and correct counts for each section to compare accuracy." : null}
    >
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="section" tick={{ fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fill: COLORS.ink }}
              axisLine={{ stroke: COLORS.border }} tickLine={{ stroke: COLORS.border }} />
            <YAxis tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: COLORS.inkMuted }}
              axisLine={{ stroke: COLORS.border }} tickLine={{ stroke: COLORS.border }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip formatter={(v) => (v === null ? "—" : `${v}%`)} cursor={{ fill: COLORS.surface2 }}
              contentStyle={{ backgroundColor: COLORS.surface, color: COLORS.ink, fontFamily: "'Inter', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "var(--shadow-floating)" }}
              labelStyle={{ fontWeight: 600, color: COLORS.ink, marginBottom: 2 }} />
            <Legend wrapperStyle={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }} />
            <Bar dataKey="Overall" fill={COLORS.ink} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
