import { ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, TYPE } from "../../constants";
import ProgressBar from "../ui/ProgressBar";
import WeightageChip from "./WeightageChip";
import MicroTopicRow from "./MicroTopicRow";

export default function MacroTopicGroup({
  macroTopic, stats, accentColor, isExpanded, expandedMicroIds, progress,
  topicMetrics,
  onToggleExpand, onToggleMicroExpand, onToggleMicroComplete,
}) {
  return (
    <div style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => onToggleExpand(macroTopic.id)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-black/[0.02]"
      >
        {isExpanded ? <ChevronDown size={15} style={{ color: COLORS.inkMuted }} /> : <ChevronRight size={15} style={{ color: COLORS.inkMuted }} />}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 style={{ ...TYPE.chartTitle, color: COLORS.ink }}>{macroTopic.name}</h4>
            <WeightageChip>{macroTopic.weightageLabel}</WeightageChip>
          </div>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 120 }}><ProgressBar percent={stats.percent} color={accentColor} height={6} /></div>
            <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
              {stats.completed}/{stats.total} · {stats.percent}%
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div style={{ background: COLORS.surface }}>
          {macroTopic.microTopics.map((micro) => (
            <MicroTopicRow
              key={micro.id}
              microTopic={micro}
              isCompleted={Boolean(progress?.[micro.id]?.completed)}
              isExpanded={expandedMicroIds.includes(micro.id)}
              onToggleComplete={onToggleMicroComplete}
              onToggleExpand={onToggleMicroExpand}
              metric={topicMetrics?.byTopicId?.[micro.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
