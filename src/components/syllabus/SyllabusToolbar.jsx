import { Maximize2, Minimize2, Search, X } from "lucide-react";
import { COLORS, TYPE } from "../../constants";
import { FREQUENCY_BUCKETS } from "../../lib/syllabusModel";

const STATUS_OPTIONS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "incomplete", label: "Incomplete" },
];

const FREQUENCY_OPTIONS = [{ key: "all", label: "All frequencies" }, ...FREQUENCY_BUCKETS.map((f) => ({ key: f, label: f }))];

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="mobile-inline-scroll flex max-w-full gap-1 p-1 flex-wrap" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 9 }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`mobile-tap-target shrink-0 px-2.5 py-1.5 text-xs ${active ? "" : "hover:bg-black/5"}`}
            style={{
              borderRadius: 6, background: active ? COLORS.primary : "transparent", color: active ? COLORS.onPrimary : COLORS.inkMuted,
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SyllabusToolbar({ filters, onSearchChange, onStatusChange, onFrequencyChange, onExpandAll, onCollapseAll }) {
  return (
    <div className="flex flex-col gap-3 p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
      <div className="mobile-control-row flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.inkMuted }} />
          <input
            type="text"
            value={filters.search}
            onChange={(ev) => onSearchChange(ev.target.value)}
            placeholder="Search topics or question types"
            className="w-full text-sm"
            style={{
              background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8,
              padding: "8px 32px 8px 32px", color: COLORS.ink, outline: "none",
            }}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: COLORS.inkMuted }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onExpandAll}
          className="mobile-tap-target inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs hover:bg-black/[0.04] shrink-0"
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
        >
          <Maximize2 size={13} /> Expand all
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="mobile-tap-target inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs hover:bg-black/[0.04] shrink-0"
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
        >
          <Minimize2 size={13} /> Collapse all
        </button>
      </div>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap">
        <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Status</span>
        <SegmentedControl options={STATUS_OPTIONS} value={filters.status} onChange={onStatusChange} />
        <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Frequency</span>
        <SegmentedControl options={FREQUENCY_OPTIONS} value={filters.frequency} onChange={onFrequencyChange} />
      </div>
    </div>
  );
}
