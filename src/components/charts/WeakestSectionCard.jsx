import { Flag } from "lucide-react";
import { COLORS, SECTION_META, SHADOW } from "../../constants";
import { fmtPct } from "../../lib/format";
import SectionBadge from "../ui/SectionBadge";

export default function WeakestSectionCard({ analysis }) {
  if (!analysis) {
    return (
      <div className="p-5" style={{ background: COLORS.surface2, border: `1px dashed ${COLORS.border}`, borderRadius: 12 }}>
        <p className="text-sm" style={{ color: COLORS.inkMuted }}>Log a few mocks across sections and the weakest-section flag will appear here automatically.</p>
      </div>
    );
  }
  const meta = SECTION_META[analysis.weakestSection];
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: meta.soft, border: `1.5px solid ${meta.color}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center gap-2">
        <Flag size={16} color={meta.color} />
        <span className="text-xs px-2 py-0.5" style={{ background: meta.color, color: COLORS.surface, borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.05em" }}>
          FLAGGED
        </span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "15px", color: meta.color }}>Weakest section: {analysis.weakestSection}</span>
      </div>
      <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.5 }}>{analysis.note}</p>
      <div className="flex gap-4 flex-wrap pt-1">
        {analysis.scored.map((s) => (
          <div key={s.section} className="flex items-center gap-2 text-xs">
            <SectionBadge section={s.section} size="sm" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.inkMuted }}>
              acc {fmtPct(s.acc)} · attempt {fmtPct(s.ar)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
