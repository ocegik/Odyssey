import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { COLORS, SECTIONS } from "../../constants";
import ChartFrame from "./ChartFrame";

export default function AccuracyComparisonChart({ sectionStats }) {
  const [mode, setMode] = useState("latest");
  const data = SECTIONS.map((sec) => {
    const latest = sectionStats[sec].latest;
    if (!latest) return { section: sec, Overall: null, MCQ: null, TITA: null };
    if (mode === "latest") {
      return {
        section: sec,
        Overall: latest.overallAccuracy !== null ? +(latest.overallAccuracy * 100).toFixed(1) : null,
        MCQ: latest.mcqAccuracy !== null ? +(latest.mcqAccuracy * 100).toFixed(1) : null,
        TITA: latest.titaAccuracy !== null ? +(latest.titaAccuracy * 100).toFixed(1) : null,
      };
    }
    return {
      section: sec,
      Overall: latest.rollAccuracy !== null ? +(latest.rollAccuracy * 100).toFixed(1) : null,
      MCQ: latest.rollMcqAccuracy !== null ? +(latest.rollMcqAccuracy * 100).toFixed(1) : null,
      TITA: latest.rollTitaAccuracy !== null ? +(latest.rollTitaAccuracy * 100).toFixed(1) : null,
    };
  });
  const hasAny = data.some((d) => d.Overall !== null);

  return (
    <ChartFrame
      title="Accuracy comparison"
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
      empty={!hasAny ? "Log at least one mock per section to compare accuracy." : null}
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
            <Bar dataKey="MCQ" fill={COLORS.info} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="TITA" fill={COLORS.warn} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
