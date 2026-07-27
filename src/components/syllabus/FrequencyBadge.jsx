import { COLORS } from "../../constants";
import { frequencyBucket } from "../../lib/syllabusModel";

const BUCKET_COLOR = {
  High: COLORS.warn,
  Medium: COLORS.info,
  Low: COLORS.inkMuted,
};

export default function FrequencyBadge({ frequency, size = "sm" }) {
  if (!frequency) return null;
  const color = BUCKET_COLOR[frequencyBucket(frequency)] || COLORS.inkMuted;
  return (
    <span
      className={size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}
      style={{
        background: `${color}1a`, color, fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700, borderRadius: 999, whiteSpace: "nowrap",
      }}
      title={`Frequency: ${frequency}`}
    >
      {frequency}
    </span>
  );
}
