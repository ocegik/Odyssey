import { getTopicChildren, getTopicNode, getTopicPickerOptions } from "../../lib/topicRegistry";

/**
 * Fast topic selection for analysis: choose one macro, then optionally refine
 * to a leaf within that macro. The stored value is always the canonical ID.
 */
export default function TopicPicker({ section, topicRef, legacyTopic = "", onChange, selectStyle, compact = false }) {
  const macroOptions = getTopicPickerOptions(section);
  const selected = getTopicNode(topicRef?.topicId);
  const selectedMacro = selected?.kind === "leaf" ? getTopicNode(selected.parentId) : selected;
  const leafOptions = selectedMacro ? getTopicChildren(selectedMacro.id) : [];
  const macroValue = selectedMacro?.id || "";
  const leafValue = selected?.kind === "leaf" ? selected.id : "";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <select
        value={macroValue}
        onChange={(event) => onChange(event.target.value || null)}
        title={legacyTopic && !topicRef ? `Legacy topic: ${legacyTopic}` : "Choose a broad topic"}
        style={{ ...selectStyle(false), minWidth: compact ? 150 : 180, height: compact ? 36 : 40, fontSize: compact ? 13 : 14 }}
      >
        <option value="">{legacyTopic && !topicRef ? "Choose topic…" : "-"}</option>
        {macroOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
      </select>
      {selectedMacro && (
        <select
          value={leafValue}
          onChange={(event) => onChange(event.target.value || selectedMacro.id)}
          title="Optional syllabus detail"
          style={{ ...selectStyle(false), minWidth: compact ? 175 : 210, height: compact ? 36 : 40, fontSize: compact ? 13 : 14 }}
        >
          <option value="">General {selectedMacro.name}</option>
          {leafOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </select>
      )}
      {legacyTopic && !topicRef && (
        <span className="text-xs" style={{ color: "var(--ink-muted, #6b7280)" }}>
          Legacy: {legacyTopic}
        </span>
      )}
    </div>
  );
}
