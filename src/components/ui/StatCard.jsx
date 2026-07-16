import { COLORS, TYPE, SHADOW } from "../../constants";

export default function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
    >
      <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>
        {label}
      </span>
      <span
        className="text-2xl"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: accent || COLORS.ink, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{sub}</span>}
    </div>
  );
}
