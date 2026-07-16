import { Lightbulb } from "lucide-react";
import { COLORS, TYPE } from "../constants";
import { buildPerMockInsights } from "../lib/perMockInsights";

function toneColor(tone) {
  if (tone === "positive") return COLORS.good;
  if (tone === "negative") return COLORS.danger;
  return COLORS.ink;
}

export default function PerMockInsightsBlock({ mock, settings, compact = false }) {
  const insights = buildPerMockInsights(mock, settings);
  if (!mock?.analysis || insights.length === 0) return null;

  return (
    <div
      className={`flex flex-col gap-3 ${compact ? "p-3" : "p-4"}`}
      style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb size={15} style={{ color: COLORS.inkMuted }} />
        <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>This mock insights</span>
      </div>
      <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-3"} gap-2`}>
        {insights.map((insight) => (
          <div key={insight.id} className="flex flex-col gap-1 p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
            <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>{insight.label}</span>
            <strong className={compact ? "text-sm" : "text-base"} style={{ color: toneColor(insight.tone), fontFamily: "'Space Grotesk', sans-serif" }}>
              {insight.value}
            </strong>
            <span className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>{insight.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
