import { SECTION_META } from "../../constants";

export default function SectionBadge({ section, size = "md" }) {
  const meta = SECTION_META[section];
  return (
    <span
      className={size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}
      style={{
        background: meta.soft, color: meta.color, border: `1px solid ${meta.color}`, fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600, borderRadius: 999, letterSpacing: "0.02em", whiteSpace: "nowrap",
        // As a flex child this would otherwise stretch to the container's
        // width and read as a bar rather than a badge. fit-content (rather
        // than alignSelf) keeps it tight without disturbing cross-axis
        // alignment in the row layouts that also use it.
        width: "fit-content",
      }}
    >
      {meta.label}
    </span>
  );
}
