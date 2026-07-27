import { CheckCircle2, ListTree, Target } from "lucide-react";
import { COLORS, SECTION_META, SHADOW, TYPE } from "../../constants";
import { SYLLABUS_TREE } from "../../lib/syllabusModel";
import StatCard from "../ui/StatCard";
import ProgressBar from "../ui/ProgressBar";

export default function SyllabusDashboard({ stats }) {
  const { overall, bySection } = stats;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Overall completion" value={`${overall.percent}%`} sub={`${overall.completed} of ${overall.total} micro topics`} accent={COLORS.primary} />
        <StatCard label="Topics completed" value={overall.completed} sub={`${overall.total - overall.completed} remaining`} accent={COLORS.good} />
        <StatCard label="Sections" value={SYLLABUS_TREE.length} sub="VARC · DILR · QA" accent={COLORS.info} />
      </div>

      <div className="p-4 flex flex-col gap-3.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
        <div className="flex items-center gap-2">
          <ListTree size={15} style={{ color: COLORS.inkMuted }} />
          <h3 style={TYPE.chartTitle}>Section progress</h3>
        </div>
        <div className="flex flex-col gap-3">
          {SYLLABUS_TREE.map((section) => {
            const meta = SECTION_META[section.colorKey];
            const s = bySection[section.id];
            return (
              <div key={section.id} className="flex items-center gap-3">
                <span className="text-sm shrink-0" style={{ width: 56, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: meta.color }}>
                  {section.name}
                </span>
                <div className="flex-1"><ProgressBar percent={s.percent} color={meta.color} /></div>
                <span className="text-xs shrink-0 text-right" style={{ width: 92, color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.completed}/{s.total} · {s.percent}%
                </span>
              </div>
            );
          })}
        </div>
        {overall.completed === overall.total && overall.total > 0 && (
          <div className="flex items-center gap-2 pt-1 text-sm" style={{ color: COLORS.good }}>
            <CheckCircle2 size={15} /> Full syllabus covered — time to focus on revision and mock accuracy.
          </div>
        )}
        {overall.completed === 0 && (
          <div className="flex items-center gap-2 pt-1 text-sm" style={{ color: COLORS.inkMuted }}>
            <Target size={15} /> Check off micro topics as you cover them to start tracking progress here.
          </div>
        )}
      </div>
    </div>
  );
}
