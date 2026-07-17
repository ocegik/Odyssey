import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { COLORS, SECTION_META, TYPE, SHADOW } from "../../constants";
import SectionBadge from "../ui/SectionBadge";

function toneMeta(tone) {
  if (tone === "positive") return { color: COLORS.good, Icon: TrendingUp };
  if (tone === "negative") return { color: COLORS.danger, Icon: TrendingDown };
  return { color: COLORS.inkMuted, Icon: Info };
}

/* `significance` (0-1, set by every insight generator) drives visual weight
   here so a page of insights reads as a ranked list, not a wall of identical
   boxes: high-significance findings get called out, low ones recede. */
function tierOf(significance) {
  const value = significance ?? 0.5;
  if (value >= 0.66) return "high";
  if (value < 0.3) return "low";
  return "default";
}

/* Tier alone can't show *how much* two "default"-tier insights differ, so
   every card also carries a small filled-bar meter driven directly by the
   raw significance value. */
function ImpactMeter({ value, color }) {
  const pct = Math.round(Math.max(0, Math.min(1, value ?? 0.5)) * 100);
  return (
    <div className="flex items-center ml-auto" title={`Relative impact: ${pct}%`}>
      <div style={{ width: 34, height: 4, borderRadius: 999, background: COLORS.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function InsightCard({ insight, icon: IconOverride }) {
  const meta = SECTION_META[insight.section];
  const tone = toneMeta(insight.tone);
  const Icon = IconOverride || tone.Icon;
  const significance = insight.significance ?? 0.5;
  const tier = tierOf(significance);
  const isHigh = tier === "high";
  const isLow = tier === "low";
  const borderWidth = 2 + Math.round(Math.max(0, Math.min(1, significance)) * 3);

  return (
    <div
      className={`flex flex-col gap-1.5 ${isHigh ? "p-4" : "p-3"}`}
      style={{
        background: isLow ? COLORS.surface : meta.soft,
        border: isLow ? `1px solid ${COLORS.border}` : "none",
        borderLeft: `${borderWidth}px solid ${meta.color}`,
        borderRadius: 8,
        boxShadow: isHigh ? SHADOW.card : "none",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Icon size={14} color={isLow ? COLORS.inkMuted : tone.color} strokeWidth={2.25} />
        <SectionBadge section={insight.section} size="sm" />
        {insight.title && (
          <span className="text-xs" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{insight.title}</span>
        )}
        {isHigh && (
          <span
            className="text-xs px-2 py-0.5"
            style={{
              background: meta.color, color: COLORS.surface, borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.05em",
            }}
          >
            KEY
          </span>
        )}
        <ImpactMeter value={significance} color={meta.color} />
      </div>
      <p
        className="text-sm"
        style={{ color: isLow ? COLORS.inkMuted : COLORS.ink, lineHeight: 1.45, fontWeight: isHigh ? 500 : 400 }}
      >
        {insight.text}
      </p>
    </div>
  );
}
