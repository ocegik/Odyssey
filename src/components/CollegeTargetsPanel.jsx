import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GraduationCap } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../constants";
import { fmtNum } from "../lib/format";
import { COLLEGE_CUTOFFS, COLLEGE_TYPE_META, reachStatus } from "../lib/collegeCutoffs";

const STATUS_META = {
  reach: { label: "Within reach", color: COLORS.good },
  stretch: { label: "Close", color: COLORS.warn },
  gap: { label: null, color: COLORS.inkMuted },
  filter: { label: "Special criteria", color: COLORS.inkMuted },
  unknown: { label: null, color: COLORS.inkMuted },
};

const COLLAPSED_COUNT = 6;

function CollegeRow({ college, currentPercentile, expanded, onToggle }) {
  const status = reachStatus(college.req, currentPercentile);
  const statusMeta = STATUS_META[status];
  const numericReq = Number(college.req);
  const reqIsNumeric = Number.isFinite(numericReq);
  const typeMeta = COLLEGE_TYPE_META[college.type] || COLLEGE_TYPE_META.Other;
  const hasSectionTargets = college.varc != null || college.dilr != null || college.qa != null || college.overall != null;

  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <button
        onClick={onToggle}
        className="theme-hover w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
        style={{ background: "transparent", border: "none" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown size={14} style={{ color: COLORS.inkMuted, flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: COLORS.inkMuted, flexShrink: 0 }} />}
          <span
            className="text-[10px] shrink-0 py-0.5"
            style={{ border: `1px solid ${typeMeta.color}`, color: typeMeta.color, borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, width: 60, textAlign: "center" }}
          >
            {typeMeta.label}
          </span>
          <span className="text-sm truncate" style={{ fontWeight: 600 }}>{college.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusMeta.label && (
            <span className="text-xs" style={{ color: statusMeta.color, fontWeight: 600 }}>{statusMeta.label}</span>
          )}
          <span
            className="text-xs"
            style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace", minWidth: 56, textAlign: "right" }}
          >
            {reqIsNumeric ? `${fmtNum(numericReq, 2)}%ile` : "n/a"}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="animate-fade-up px-3 pb-3 pl-8 flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: COLORS.inkMuted }}>{college.tag}</span>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>{college.info}</p>
          {hasSectionTargets && (
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
              {college.varc != null && <span>VARC {fmtNum(college.varc, 0)}</span>}
              {college.dilr != null && <span>DILR {fmtNum(college.dilr, 0)}</span>}
              {college.qa != null && <span>QA {fmtNum(college.qa, 0)}</span>}
              {college.overall != null && <span>Overall {fmtNum(college.overall, 0)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollegeTargetsPanel({ currentPercentile }) {
  const [expandedName, setExpandedName] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    return [...COLLEGE_CUTOFFS].sort((a, b) => {
      const reqA = Number(a.req);
      const reqB = Number(b.req);
      const validA = Number.isFinite(reqA);
      const validB = Number.isFinite(reqB);
      if (validA && validB) {
        return currentPercentile !== null && currentPercentile !== undefined
          ? Math.abs(reqA - currentPercentile) - Math.abs(reqB - currentPercentile)
          : reqA - reqB;
      }
      if (validA) return -1;
      if (validB) return 1;
      return 0;
    });
  }, [currentPercentile]);

  const reachCount = useMemo(
    () => sorted.filter((college) => reachStatus(college.req, currentPercentile) === "reach").length,
    [sorted, currentPercentile]
  );

  const visible = showAll ? sorted : sorted.slice(0, COLLAPSED_COUNT);

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center justify-between gap-3 flex-wrap p-4 pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} style={{ color: COLORS.inkMuted }} />
          <h3 style={TYPE.chartTitle}>College targets</h3>
        </div>
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>
          {currentPercentile !== null && currentPercentile !== undefined
            ? `${reachCount} of ${sorted.length} within reach at your latest ${fmtNum(currentPercentile, 2)}%ile`
            : "Log a mock with a percentile to compare — showing required percentiles for now"}
        </span>
      </div>

      <div>
        {visible.map((college) => (
          <CollegeRow
            key={college.name}
            college={college}
            currentPercentile={currentPercentile}
            expanded={expandedName === college.name}
            onToggle={() => setExpandedName((current) => (current === college.name ? null : college.name))}
          />
        ))}
      </div>

      {sorted.length > COLLAPSED_COUNT && (
        <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="theme-hover w-full text-center px-3 py-2.5 text-xs"
            style={{ color: COLORS.inkMuted, background: "transparent", border: "none", fontWeight: 600 }}
          >
            {showAll ? "Show less" : `Show all ${sorted.length} programs`}
          </button>
        </div>
      )}
    </div>
  );
}
