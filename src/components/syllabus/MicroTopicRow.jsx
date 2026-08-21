import { ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, TYPE } from "../../constants";
import FrequencyBadge from "./FrequencyBadge";

export default function MicroTopicRow({ microTopic, isCompleted, isExpanded, onToggleComplete, onToggleExpand, metric }) {
  const hasQuestionTypes = microTopic.questionTypes.length > 0;

  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <div className="flex items-start gap-2.5 py-2.5 pl-2 pr-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onToggleComplete(microTopic.id)}
          aria-label={`Mark "${microTopic.name}" as ${isCompleted ? "incomplete" : "complete"}`}
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ accentColor: COLORS.good, cursor: "pointer" }}
        />

        <button
          type="button"
          onClick={() => hasQuestionTypes && onToggleExpand(microTopic.id)}
          className="theme-hover flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md px-1.5 py-0.5 text-left min-w-0"
          style={{ cursor: hasQuestionTypes ? "pointer" : "default" }}
          disabled={!hasQuestionTypes}
        >
          <span
            className="text-sm"
            style={{ color: isCompleted ? COLORS.inkMuted : COLORS.ink, textDecoration: isCompleted ? "line-through" : "none", fontWeight: 500 }}
          >
            {microTopic.name}
          </span>
          <FrequencyBadge frequency={microTopic.frequency} />
          {metric?.total > 0 && (
            <span className="text-xs" style={{ color: metric.weak ? COLORS.danger : COLORS.inkMuted }}>
              {metric.attempted > 0
                ? `Mock: ${metric.correct}/${metric.attempted} · ${Math.round(metric.accuracy * 100)}% · ${metric.total} tagged`
                : `Mock: ${metric.total} tagged`}
            </span>
          )}
          {microTopic.frequencyNote && (
            <span className="text-xs" style={{ color: COLORS.inkMuted }}>({microTopic.frequencyNote})</span>
          )}
          {microTopic.note && (
            <span className="text-xs italic" style={{ color: COLORS.inkMuted }}>{microTopic.note}</span>
          )}
          {hasQuestionTypes && (
            <span className="ml-auto flex items-center gap-1 text-xs shrink-0" style={{ color: COLORS.inkMuted }}>
              {microTopic.questionTypes.length} question type{microTopic.questionTypes.length === 1 ? "" : "s"}
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          )}
        </button>
      </div>

      {isExpanded && hasQuestionTypes && (
        <div className="flex flex-col gap-2.5 pb-3 pl-8 pr-3">
          <ul className="flex flex-col gap-1.5">
            {microTopic.questionTypes.map((qt) => (
              <li key={qt.id} className="text-xs leading-relaxed flex gap-2" style={{ color: COLORS.inkMuted }}>
                <span style={{ ...TYPE.label, color: COLORS.inkMuted, flexShrink: 0 }}>•</span>
                <span>{qt.text}</span>
              </li>
            ))}
          </ul>
          {metric?.loggedQuestions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {metric.loggedQuestions.slice(0, 6).map((question) => (
                <span
                  key={`${question.mockId}-${question.section}-${question.questionNumber}`}
                  className="px-1.5 py-0.5 text-xs"
                  style={{ color: COLORS.inkMuted, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 5 }}
                  title={`${question.mockSource} · ${question.mockDate} · ${question.section} Q${question.questionNumber}`}
                >
                  {question.mockSource} · Q{question.questionNumber}
                </span>
              ))}
              {metric.loggedQuestions.length > 6 && (
                <span className="text-xs self-center" style={{ color: COLORS.inkMuted }}>+{metric.loggedQuestions.length - 6} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
