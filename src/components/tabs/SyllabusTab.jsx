import { useMemo } from "react";
import { SearchX } from "lucide-react";
import { COLORS } from "../../constants";
import { computeSyllabusStats, filterSyllabusTree } from "../../lib/syllabusModel";
import EmptyState from "../ui/EmptyState";
import SyllabusDashboard from "../syllabus/SyllabusDashboard";
import SyllabusToolbar from "../syllabus/SyllabusToolbar";
import SyllabusSectionCard from "../syllabus/SyllabusSectionCard";

export default function SyllabusTab({
  progress, topicMetrics, revisionQueue, expanded, filters,
  onToggleMicroComplete, onToggleSectionExpanded, onToggleMacroExpanded, onToggleMicroExpanded,
  onExpandAll, onCollapseAll, onSetSearch, onSetStatusFilter, onSetFrequencyFilter,
}) {
  const stats = useMemo(() => computeSyllabusStats(progress), [progress]);
  const { tree: filteredTree, matchCount } = useMemo(
    () => filterSyllabusTree(progress, filters),
    [progress, filters]
  );

  const filtersActive = Boolean(filters.search) || filters.status !== "all" || filters.frequency !== "all";

  return (
    <div className="flex flex-col gap-4">
      <SyllabusDashboard stats={stats} topicMetrics={topicMetrics} revisionQueue={revisionQueue} />

      <SyllabusToolbar
        filters={filters}
        onSearchChange={onSetSearch}
        onStatusChange={onSetStatusFilter}
        onFrequencyChange={onSetFrequencyFilter}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
      />

      {filtersActive && (
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>
          {matchCount} micro topic{matchCount === 1 ? "" : "s"} match{matchCount === 1 ? "es" : ""} the current filters
        </span>
      )}

      {filteredTree.length === 0 ? (
        <EmptyState icon={SearchX} title="No topics match these filters" body="Clear the search or adjust the status and frequency filters." />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredTree.map((section) => (
            <SyllabusSectionCard
              key={section.id}
              section={section}
              sectionStats={stats.bySection[section.id]}
              macroStats={stats.byMacroTopic}
              isExpanded={expanded.sections.includes(section.id)}
              expandedMacroIds={expanded.macros}
              expandedMicroIds={expanded.micros}
              progress={progress}
              topicMetrics={topicMetrics}
              onToggleSectionExpand={onToggleSectionExpanded}
              onToggleMacroExpand={onToggleMacroExpanded}
              onToggleMicroExpand={onToggleMicroExpanded}
              onToggleMicroComplete={onToggleMicroComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
