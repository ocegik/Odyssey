import { SECTION_META } from "../../constants";

export default function SectionBadge({ section, size = "md" }) {
  const meta = SECTION_META[section];
  return (
    <span
      className={size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}
      style={{
        background: meta.soft, color: meta.color, fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600, borderRadius: 999, letterSpacing: "0.02em", whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}
