import { Lightbulb } from "lucide-react";
import { COLORS } from "../constants";
import SectionBadge from "./ui/SectionBadge";
import StatCard from "./ui/StatCard";

function RecommendationCard({ recommendation }) {
  return (
    <div className="p-3 flex items-start gap-2.5" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <Lightbulb size={15} style={{ color: COLORS.inkMuted, flexShrink: 0, marginTop: 2 }} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SectionBadge section={recommendation.section} size="sm" />
          <span className="text-xs" style={{ color: COLORS.inkMuted }}>from: {recommendation.basedOn}</span>
        </div>
        <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.45 }}>{recommendation.text}</p>
      </div>
    </div>
  );
}

export function AdvancedStatCards({ analysis }) {
  return (
    <>
      <StatCard label="Set patterns found" value={analysis.setInsights.length} />
      <StatCard label="Topic insights" value={analysis.topicInsights.length} />
      <StatCard label="Recommendations" value={analysis.recommendations.length} />
    </>
  );
}

export function RecommendationList({ recommendations }) {
  return (
    <div className="flex flex-col gap-2">
      {recommendations.map((rec) => <RecommendationCard key={rec.id} recommendation={rec} />)}
    </div>
  );
}
