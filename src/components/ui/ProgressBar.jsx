import { COLORS } from "../../constants";

export default function ProgressBar({ percent, color, height = 8, track }) {
  const clamped = Math.max(0, Math.min(100, percent || 0));
  return (
    <div style={{ height, borderRadius: 999, background: track || COLORS.surface2, overflow: "hidden" }}>
      <div style={{ width: `${clamped}%`, height: "100%", background: color || COLORS.primary, borderRadius: 999, transition: "width 200ms ease" }} />
    </div>
  );
}
