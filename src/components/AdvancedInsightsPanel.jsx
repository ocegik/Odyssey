import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { COLORS } from "../constants";
import { buildAdvancedInsights } from "../lib/advancedInsights";
import ChartFrame from "./charts/ChartFrame";
import InsightList from "./charts/InsightList";
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

export default function AdvancedInsightsPanel({ mocks }) {
  const analysis = useMemo(() => buildAdvancedInsights(mocks), [mocks]);
  const hasAnyData = analysis.setRecords.length > 0 || analysis.topicRecords.length > 0;
  const noDataMessage = "Attach detailed analysis with tagged set/question topics to unlock set-pattern and topic-based insights.";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Set patterns found" value={analysis.setInsights.length} />
        <StatCard label="Topic insights" value={analysis.topicInsights.length} />
        <StatCard label="Recommendations" value={analysis.recommendations.length} />
      </div>

      <ChartFrame
        title="Set-level insights"
        note="Why a set went the way it did, not just the score"
        empty={!hasAnyData ? noDataMessage : analysis.setInsights.length === 0 ? "No strong set-level patterns yet — keep tagging set topics and logging mocks." : null}
      >
        <InsightList insights={analysis.setInsights} />
      </ChartFrame>

      <ChartFrame
        title="Topic-based insights"
        note="Accuracy, time, confidence, and trend by topic"
        empty={!hasAnyData ? noDataMessage : analysis.topicInsights.length === 0 ? "No strong topic patterns yet — tag more questions and log a few more mocks." : null}
      >
        <InsightList insights={analysis.topicInsights} />
      </ChartFrame>

      <ChartFrame
        title="Recommendations"
        note="Evidence-based next steps, tied to the pattern that triggered them"
        empty={analysis.recommendations.length === 0 ? "No actionable recommendations yet." : null}
      >
        <div className="flex flex-col gap-2">
          {analysis.recommendations.map((rec) => <RecommendationCard key={rec.id} recommendation={rec} />)}
        </div>
      </ChartFrame>
    </div>
  );
}
