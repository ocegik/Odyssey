import { useMemo } from "react";
import { Info, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { COLORS, SECTION_META, TYPE } from "../constants";
import { buildAdvancedInsights } from "../lib/advancedInsights";
import ChartFrame from "./charts/ChartFrame";
import SectionBadge from "./ui/SectionBadge";
import StatCard from "./ui/StatCard";

function toneMeta(tone) {
  if (tone === "positive") return { color: COLORS.good, Icon: TrendingUp };
  if (tone === "negative") return { color: COLORS.danger, Icon: TrendingDown };
  return { color: COLORS.inkMuted, Icon: Info };
}

function AdvancedInsightCard({ insight }) {
  const meta = SECTION_META[insight.section];
  const tone = toneMeta(insight.tone);
  return (
    <div className="p-3 flex flex-col gap-1.5" style={{ background: meta.soft, borderLeft: `3px solid ${meta.color}`, borderRadius: 8 }}>
      <div className="flex items-center gap-2">
        <tone.Icon size={14} color={tone.color} strokeWidth={2.25} />
        <SectionBadge section={insight.section} size="sm" />
        <span className="text-xs" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{insight.title}</span>
      </div>
      <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.45 }}>{insight.text}</p>
    </div>
  );
}

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
        <div className="flex flex-col gap-2">
          {analysis.setInsights.map((insight) => <AdvancedInsightCard key={insight.id} insight={insight} />)}
        </div>
      </ChartFrame>

      <ChartFrame
        title="Topic-based insights"
        note="Accuracy, time, confidence, and trend by topic"
        empty={!hasAnyData ? noDataMessage : analysis.topicInsights.length === 0 ? "No strong topic patterns yet — tag more questions and log a few more mocks." : null}
      >
        <div className="flex flex-col gap-2">
          {analysis.topicInsights.map((insight) => <AdvancedInsightCard key={insight.id} insight={insight} />)}
        </div>
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
