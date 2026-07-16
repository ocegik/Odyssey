import { TrendingUp, TrendingDown } from "lucide-react";
import { COLORS, SECTION_META } from "../../constants";
import SectionBadge from "../ui/SectionBadge";

export default function InsightCard({ insight }) {
  const meta = SECTION_META[insight.section];
  const Icon = insight.tone === "positive" ? TrendingUp : TrendingDown;
  const iconColor = insight.tone === "positive" ? COLORS.good : COLORS.danger;

  return (
    <div
      className="p-3 flex flex-col gap-1.5"
      style={{ background: meta.soft, borderLeft: `3px solid ${meta.color}`, borderRadius: 8 }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} color={iconColor} strokeWidth={2.25} />
        <SectionBadge section={insight.section} size="sm" />
      </div>
      <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.45 }}>{insight.text}</p>
    </div>
  );
}
