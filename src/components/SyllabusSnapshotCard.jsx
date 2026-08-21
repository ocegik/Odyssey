import { ListChecks, ArrowRight, CheckCircle2 } from "lucide-react";
import { COLORS, SECTION_META, SHADOW, TYPE } from "../constants";
import { SYLLABUS_TREE } from "../lib/syllabusModel";
import ProgressBar from "./ui/ProgressBar";
import FrequencyBadge from "./syllabus/FrequencyBadge";
import { createChartShareImage, shareSeries } from "../lib/shareImage";
import ShareImageButton from "./ui/ShareImageButton";

function SectionMiniRow({ section, stat }) {
  const meta = SECTION_META[section.colorKey];
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs shrink-0" style={{ width: 44, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: meta.color }}>
        {section.name}
      </span>
      <div className="flex-1"><ProgressBar percent={stat.percent} color={meta.color} height={6} /></div>
      <span className="text-xs shrink-0 text-right" style={{ width: 36, color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
        {stat.percent}%
      </span>
    </div>
  );
}

function HighFrequencyRow({ topic }) {
  const meta = SECTION_META[topic.section.colorKey];
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs shrink-0" style={{ color: meta.color, fontWeight: 700, width: 38 }}>{topic.section.name}</span>
        <span className="text-sm truncate" style={{ color: COLORS.ink }}>{topic.name}</span>
      </div>
      <FrequencyBadge frequency={topic.frequency} />
    </div>
  );
}

function FocusAreaRow({ macro }) {
  const meta = SECTION_META[macro.section.colorKey];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs shrink-0" style={{ color: meta.color, fontWeight: 700, width: 38 }}>{macro.section.name}</span>
          <span className="text-sm truncate" style={{ color: COLORS.ink }}>{macro.name}</span>
        </div>
        <span className="text-xs shrink-0" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
          {macro.completed}/{macro.total}
        </span>
      </div>
      <ProgressBar percent={macro.percent} color={meta.color} height={5} />
    </div>
  );
}

function EmptyListNote({ text }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs" style={{ color: COLORS.inkMuted }}>
      <CheckCircle2 size={13} style={{ color: COLORS.good, flexShrink: 0 }} /> {text}
    </div>
  );
}

/* Compact "what to study next" snapshot of the Syllabus module for the
   Overview dashboard — summarises completion rather than exposing the full
   hierarchy. All numbers come from syllabusModel selectors, never
   recomputed here, so this stays in sync with the Syllabus tab by
   construction. */
export default function SyllabusSnapshotCard({ stats, highFrequencyRemaining, leastCompletedMacroTopics, onOpenSyllabus, studentName }) {
  const { overall, bySection } = stats;
  const remaining = overall.total - overall.completed;

  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks size={15} style={{ color: COLORS.inkMuted }} />
          <h3 style={TYPE.chartTitle}>Syllabus progress</h3>
        </div>
        <div className="flex items-center gap-2">
          <ShareImageButton createImage={() => createChartShareImage({ title: "Syllabus Progress", studentName, data: [{ label: "Completion", VARC: bySection.VARC?.percent, DILR: bySection.DILR?.percent, Quant: bySection.Quant?.percent }], series: [shareSeries.VARC, shareSeries.DILR, shareSeries.Quant], chartType: "bar", domain: [0, 100], suffix: "%", metrics: [{ label: "Overall completion", value: `${overall.percent}%` }], filename: "odyssey-syllabus-progress.png" })} />
        {onOpenSyllabus && (
          <button
            onClick={onOpenSyllabus}
            className="theme-hover flex items-center gap-1 px-2.5 py-1 text-xs"
            style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 999, color: COLORS.inkMuted, fontWeight: 600 }}
          >
            Open syllabus <ArrowRight size={12} />
          </button>
        )}
        </div>
      </div>

      <div className="flex items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Overall completion</span>
          <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 30, color: COLORS.ink }}>{overall.percent}%</strong>
        </div>
        <div className="flex flex-col gap-1">
          <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Micro topics</span>
          <span className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.inkMuted }}>
            {overall.completed} done · {remaining} left
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {SYLLABUS_TREE.map((section) => (
          <SectionMiniRow key={section.id} section={section} stat={bySection[section.id]} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="flex flex-col gap-2 pt-3">
          <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>High-frequency topics still open</span>
          {highFrequencyRemaining.length === 0 ? (
            <EmptyListNote text="No high-frequency topics are marked open." />
          ) : (
            <div className="flex flex-col gap-2">
              {highFrequencyRemaining.map((topic) => <HighFrequencyRow key={topic.id} topic={topic} />)}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-3">
          <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Topics with the least coverage</span>
          {leastCompletedMacroTopics.length === 0 ? (
            <EmptyListNote text="Every main topic is marked complete." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {leastCompletedMacroTopics.map((macro) => <FocusAreaRow key={macro.id} macro={macro} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
