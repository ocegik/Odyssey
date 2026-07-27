import { COLORS } from "../../constants";

export default function WeightageChip({ children }) {
  if (!children) return null;
  return (
    <span
      className="px-2 py-0.5 text-xs"
      style={{
        border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.inkMuted,
        fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
