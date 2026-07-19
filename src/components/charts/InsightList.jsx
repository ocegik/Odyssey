import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { COLORS, SECTION_META, TYPE } from "../../constants";

function toneMeta(tone) {
  if (tone === "positive") return { color: COLORS.good, Icon: TrendingUp };
  if (tone === "negative") return { color: COLORS.danger, Icon: TrendingDown };
  return { color: COLORS.inkMuted, Icon: Info };
}

/* A thin fill bar driven by the raw `significance` (0-1) value every insight
   generator already computes — gives every row a legible, granular weight
   cue instead of leaning on section color alone. Labeled with its percentage
   so the bar isn't a mystery mark. */
function ImpactMeter({ value, color }) {
  const pct = Math.round(Math.max(0, Math.min(1, value ?? 0.5)) * 100);
  return (
    <div className="flex items-center gap-1.5 shrink-0" title={`Relative impact: ${pct}%`}>
      <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
      <div style={{ width: 24, height: 4, borderRadius: 999, background: COLORS.border, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* Only the single most significant insight gets a colored callout treatment
   — everything else renders as a plain row, so a list never reads as a wall
   of identically-tinted boxes. */
function InsightHero({ insight, Icon, tone }) {
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
          TOP SIGNAL
        </span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: meta.color }}>{meta.label}</span>
        {insight.title && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{insight.title}</span>}
        <Icon size={15} color={tone.color} strokeWidth={2.5} style={{ marginLeft: "auto" }} />
      </div>
      <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.5, fontWeight: 500 }}>{insight.text}</p>
    </div>
  );
}

function InsightRow({ insight, Icon, tone }) {
  const meta = SECTION_META[insight.section];
  return (
    <div
      className="p-3 flex items-start gap-3"
      style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${meta.color}`, borderRadius: 10 }}
    >
      <Icon size={13} color={tone.color} strokeWidth={2.25} style={{ marginTop: 3, flexShrink: 0 }} />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span style={{ ...TYPE.label, color: meta.color }}>{meta.label}</span>
          {insight.title && <span className="text-xs" style={{ color: COLORS.inkMuted }}>· {insight.title}</span>}
        </div>
        <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.45 }}>{insight.text}</p>
      </div>
      <ImpactMeter value={insight.significance} color={meta.color} />
    </div>
  );
}

/**
 * Renders a ranked insight feed: insights arrive pre-sorted by significance,
 * so the first item becomes a one-off colored callout and the rest sit in a
 * quiet list underneath — color is spent once, not repeated per item.
 * `iconFor(insight)` optionally overrides the default tone-based icon.
 */
export default function InsightList({ insights, iconFor }) {
  if (!insights || insights.length === 0) return null;
  const [hero, ...rest] = insights;
  const heroTone = toneMeta(hero.tone);
  const HeroIcon = (iconFor && iconFor(hero)) || heroTone.Icon;

  return (
    <div className="flex flex-col gap-3">
      <InsightHero insight={hero} Icon={HeroIcon} tone={heroTone} />
      {rest.map((insight) => {
        const tone = toneMeta(insight.tone);
        const Icon = (iconFor && iconFor(insight)) || tone.Icon;
        return <InsightRow key={insight.id} insight={insight} Icon={Icon} tone={tone} />;
      })}
    </div>
  );
}
