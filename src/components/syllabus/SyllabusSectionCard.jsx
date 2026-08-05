import { ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, SECTION_META, SHADOW, TYPE } from "../../constants";
import ProgressBar from "../ui/ProgressBar";
import WeightageChip from "./WeightageChip";
import MacroTopicGroup from "./MacroTopicGroup";

export default function SyllabusSectionCard({
  section, sectionStats, macroStats, isExpanded, expandedMacroIds, expandedMicroIds, progress,
  topicMetrics,
  onToggleSectionExpand, onToggleMacroExpand, onToggleMicroExpand, onToggleMicroComplete,
}) {
  const meta = SECTION_META[section.colorKey];

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => onToggleSectionExpand(section.id)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black/[0.02]"
      >
        {isExpanded ? <ChevronDown size={18} style={{ color: COLORS.inkMuted }} /> : <ChevronRight size={18} style={{ color: COLORS.inkMuted }} />}
        <span className="shrink-0" style={{ width: 10, height: 10, borderRadius: 999, background: meta.color }} />
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 style={{ ...TYPE.panelTitle, color: COLORS.ink }}>{section.name}</h3>
            <span className="text-sm" style={{ color: COLORS.inkMuted }}>{section.fullName}</span>
            <WeightageChip>{section.weightageLabel}</WeightageChip>
          </div>
          <div className="flex items-center gap-3 max-w-md">
            <div className="flex-1"><ProgressBar percent={sectionStats.percent} color={meta.color} /></div>
            <span className="text-xs shrink-0" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
              {sectionStats.completed}/{sectionStats.total} · {sectionStats.percent}%
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          {section.macroTopics.map((macro) => (
            <MacroTopicGroup
              key={macro.id}
              macroTopic={macro}
              stats={macroStats[macro.id]}
              accentColor={meta.color}
              isExpanded={expandedMacroIds.includes(macro.id)}
              expandedMicroIds={expandedMicroIds}
              progress={progress}
              topicMetrics={topicMetrics}
              onToggleExpand={onToggleMacroExpand}
              onToggleMicroExpand={onToggleMicroExpand}
              onToggleMicroComplete={onToggleMicroComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
