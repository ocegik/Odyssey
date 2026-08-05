import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { COLORS, SECTION_META } from "../../constants";

export function toneMeta(tone) {
  if (tone === "positive") return { color: COLORS.good, Icon: TrendingUp };
  if (tone === "negative") return { color: COLORS.danger, Icon: TrendingDown };
  return { color: COLORS.inkMuted, Icon: Info };
}

/* The one colored-callout treatment on the page, shared by InsightList (for
   its per-list top item) and TopSignals (for the page-level ranked feed) so
   "this is important" always looks the same way. `badge` defaults to "TOP
   SIGNAL" but TopSignals overrides it to "#2"/"#3"/... past the first item,
   so multiple heroes in one feed read as a ranking, not N competing #1s. */
export function InsightHero({ insight, Icon, tone, badge = "TOP SIGNAL" }) {
  const meta = SECTION_META[insight.section];
  return (
    <div className="p-4 flex flex-col gap-2" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${meta.color}`, borderRadius: 10 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs px-2 py-0.5"
          style={{
            background: meta.color, color: COLORS.surface, borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.05em",
          }}
        >
          {badge}
        </span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: meta.color }}>{meta.label}</span>
        {insight.title && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{insight.title}</span>}
        <Icon size={15} color={tone.color} strokeWidth={2.5} style={{ marginLeft: "auto" }} />
      </div>
      <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.5, fontWeight: 500 }}>{insight.text}</p>
    </div>
  );
}
