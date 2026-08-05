import { COLORS, SECTION_META, TYPE } from "../../constants";
import { InsightHero, toneMeta } from "./InsightHero";

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
 * Renders a ranked insight feed: insights arrive pre-sorted by significance.
 * By default the first item becomes a one-off colored callout and the rest
 * sit in a quiet list underneath — color is spent once, not repeated per
 * item. Pass `showHero={false}` when the feed is a secondary/demoted list on
 * a page that already has its own dedicated hero elsewhere (e.g. a page-level
 * "Top Signals" section), so this list doesn't spend a second competing hero.
 * `iconFor(insight)` optionally overrides the default tone-based icon.
 */
export default function InsightList({ insights, iconFor, showHero = true }) {
  if (!insights || insights.length === 0) return null;

  if (!showHero) {
    return (
      <div className="flex flex-col gap-3">
        {insights.map((insight) => {
          const tone = toneMeta(insight.tone);
          const Icon = (iconFor && iconFor(insight)) || tone.Icon;
          return <InsightRow key={insight.id} insight={insight} Icon={Icon} tone={tone} />;
        })}
      </div>
    );
  }

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
