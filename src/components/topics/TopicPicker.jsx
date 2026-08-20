import { getTopicChildren, getTopicNode, getTopicPickerOptions } from "../../lib/topicRegistry";

/**
 * Fast topic selection for analysis: choose one macro, then optionally refine
 * to a leaf within that macro. The stored value is always the canonical ID.
 */
export default function TopicPicker({ section, topicRef, legacyTopic = "", onChange, selectStyle, compact = false, disabled = false }) {
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
        disabled={disabled}
        title={legacyTopic && !topicRef ? `Legacy topic: ${legacyTopic}` : (section === "VARC" ? "Choose section / passage domain" : "Choose a broad topic")}
        style={{ ...selectStyle(false), minWidth: compact ? 150 : 180, height: compact ? 36 : 40, fontSize: compact ? 13 : 14 }}
      >
        <option value="">{legacyTopic && !topicRef ? (section === "VARC" ? "Choose domain…" : "Choose topic…") : "-"}</option>
        {macroOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
      </select>
      {selectedMacro && (
        <select
          value={leafValue}
          onChange={(event) => onChange(event.target.value || selectedMacro.id)}
          disabled={disabled}
          title={section === "VARC" && selectedMacro.id === "varc-rc" ? "Select Passage Domain or question type" : "Optional syllabus detail"}
          style={{ ...selectStyle(false), minWidth: compact ? 175 : 210, height: compact ? 36 : 40, fontSize: compact ? 13 : 14 }}
        >
          <option value="">
            {section === "VARC" && selectedMacro.id === "varc-rc" ? "General RC / Unspecified Domain" : `General ${selectedMacro.name}`}
          </option>
          {(() => {
            const hasCategories = leafOptions.some((opt) => opt.category);
            if (!hasCategories) {
              return leafOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>);
            }
            const groups = [];
            const groupMap = new Map();
            leafOptions.forEach((topic) => {
              const cat = topic.category || "General";
              if (!groupMap.has(cat)) {
                const group = { category: cat, items: [] };
                groupMap.set(cat, group);
                groups.push(group);
              }
              groupMap.get(cat).items.push(topic);
            });
            return groups.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.items.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </optgroup>
            ));
          })()}
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
