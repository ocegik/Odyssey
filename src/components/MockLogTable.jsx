import { Fragment, memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ChevronUp, FileCheck2, FilePlus2, Layers3, MoreVertical, Pencil, Search, Trash2 } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../constants";
import { fmtDate, fmtNum, fmtPct } from "../lib/format";
import { mockTotalMarks } from "../lib/compute";
import { inputStyle } from "./ui/FieldLabel";
import SectionBadge from "./ui/SectionBadge";
import EmptyState from "./ui/EmptyState";
import PerMockInsightsBlock from "./PerMockInsightsBlock";

function SortIndicator({ active, dir }) {
  if (!active) return null;
  return dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

function SortableHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-hover inline-flex items-center gap-1"
      style={{ background: "transparent", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer" }}
    >
      {label}
      <SortIndicator active={active} dir={dir} />
    </button>
  );
}

function analysisLabel(mock) {
  if (!mock.analysis) return "No analysis";
  const total = mock.analysis.summary?.totalQuestions || 0;
  return total > 0 ? `${total} questions` : "Attached";
}

function structureLabel(section) {
  if (!section) return "";
  const total = section.totalQuestions || 0;
  const sets = section.questionBlocks?.filter((block) => block.type === "set").length || section.questionSetCount || 0;
  return `${total} Q · ${sets} sets`;
}

function quickStatsLabel(section) {
  if (!section) return "";
  const parts = [];
  if (section.overallAccuracy !== null && section.overallAccuracy !== undefined) parts.push(`${fmtPct(section.overallAccuracy)} acc`);
  if (section.attemptRate !== null && section.attemptRate !== undefined) parts.push(`${fmtPct(section.attemptRate)} att`);
  return parts.join(" · ");
}

function RowActionsMenu({ mockSource, hasAnalysis, onOpenAnalysis, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const Icon = hasAnalysis ? FileCheck2 : FilePlus2;

  return (
    <div
      className="relative inline-block"
      tabIndex={-1}
      onBlur={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${mockSource}`}
        className="theme-hover inline-flex items-center justify-center"
        style={{ width: 32, height: 32, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.inkMuted }}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute right-0 top-full mt-1 flex flex-col"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "var(--shadow-floating)", minWidth: 172, overflow: "hidden", zIndex: 20 }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenAnalysis();
            }}
            className="theme-hover flex items-center gap-2 px-3 py-2 text-xs text-left"
            style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
          >
            <Icon size={13} />
            {hasAnalysis ? "Open analysis" : "Add analysis"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="theme-hover flex items-center gap-2 px-3 py-2 text-xs text-left"
            style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, borderTop: `1px solid ${COLORS.border}` }}
          >
            <Pencil size={13} />
            Edit mock
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="theme-hover flex items-center gap-2 px-3 py-2 text-xs text-left"
            style={{ color: COLORS.danger, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, borderTop: `1px solid ${COLORS.border}` }}
          >
            <Trash2 size={13} />
            Delete mock
          </button>
        </div>
      )}
    </div>
  );
}

function MockLogTable({ mocks, settings, onOpenAnalysis, onEditMock, onDeleteMock }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // Chronological (oldest-first) regardless of the table's display sort, so
  // "prior mock" for the target-score insight always means chronologically
  // prior — not whatever's above it in the current sort/filter view.
  const chronological = useMemo(
    () => [...mocks].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date))),
    [mocks]
  );
  const priorMarksByMockId = useMemo(() => {
    const map = new Map();
    chronological.forEach((mock, idx) => {
      map.set(mock.id, idx > 0 ? mockTotalMarks(chronological[idx - 1]) : null);
    });
    return map;
  }, [chronological]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return mocks;
    return mocks.filter((mock) => mock.source.toLowerCase().includes(query) || fmtDate(mock.date).toLowerCase().includes(query));
  }, [mocks, searchQuery]);

  const rows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "marks") return (mockTotalMarks(a) - mockTotalMarks(b)) * dir;
      if (a.date === b.date) return (a.createdAt - b.createdAt) * dir;
      return a.date.localeCompare(b.date) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  if (mocks.length === 0) {
    return <EmptyState icon={Layers3} title="No mocks yet" body="Log a full mock from Add Analysis; optional detailed analysis can attach to that same mock." />;
  }

  const allExpanded = rows.length > 0 && rows.every((mock) => expandedIds.has(mock.id));

  const toggleRow = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(rows.map((mock) => mock.id)));
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>
          {searchQuery ? `${rows.length} of ${mocks.length} mocks match` : `${rows.length} mock${rows.length === 1 ? "" : "s"} logged`} — expand a row for insights &amp; structure
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: COLORS.inkMuted, pointerEvents: "none" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(ev) => setSearchQuery(ev.target.value)}
              placeholder="Filter by source or date"
              style={{ ...inputStyle(false), height: 32, paddingLeft: 28, paddingTop: 6, paddingBottom: 6, fontSize: 12.5, width: 190 }}
            />
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
          >
            {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-4 text-center text-sm" style={{ background: COLORS.surface2, border: `1px dashed ${COLORS.border}`, borderRadius: 12, color: COLORS.inkMuted }}>
          No mocks match "{searchQuery}".
        </div>
      ) : (
      <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted, width: 1 }} />
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
                <SortableHeader label="Mock" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
              </th>
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted }}>Sections</th>
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
                <SortableHeader label="Marks" active={sortKey === "marks"} dir={sortDir} onClick={() => toggleSort("marks")} />
              </th>
              <th className="px-3 py-2.5 text-right" style={{ ...TYPE.label, color: COLORS.inkMuted, width: 1 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((mock, i) => {
              const sectionNames = SECTIONS.filter((section) => mock[section]);
              const sectionMarks = sectionNames.reduce((sum, section) => sum + (mock[section]?.totalMarks || 0), 0);
              const totalMarks = mock.manualTotalMarks ?? sectionMarks;
              const hasAnalysis = Boolean(mock.analysis);
              const priorMarks = priorMarksByMockId.get(mock.id) ?? null;
              const expanded = expandedIds.has(mock.id);
              const rowBg = i % 2 ? COLORS.surface : COLORS.surface2;

              const handleDelete = () => {
                if (window.confirm(`Delete "${mock.source}" (${fmtDate(mock.date)})? This can't be undone.`)) {
                  onDeleteMock(mock.id);
                }
              };

              return (
                <Fragment key={mock.id}>
                  <tr className="hover:bg-black/[0.025]" style={{ borderBottom: expanded ? "none" : `1px solid ${COLORS.border}`, background: rowBg }}>
                    <td className="pl-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleRow(mock.id)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${mock.source}`}
                        className="theme-hover inline-flex items-center justify-center"
                        style={{ width: 26, height: 26, borderRadius: 6, color: COLORS.inkMuted }}
                      >
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5" style={{ fontWeight: 650 }}>
                          {mock.source}
                          {hasAnalysis && <FileCheck2 size={13} style={{ color: COLORS.good }} />}
                        </span>
                        <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(mock.date)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {sectionNames.map((section) => (
                          <span key={section} className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5">
                              <SectionBadge section={section} size="sm" />
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 650 }}>{fmtNum(mock[section]?.totalMarks, 0)}</span>
                            </span>
                            {expanded && (
                              <span className="text-xs" style={{ color: COLORS.inkMuted }}>
                                {structureLabel(mock[section])}
                                {quickStatsLabel(mock[section]) && ` · ${quickStatsLabel(mock[section])}`}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 650 }}>
                      {fmtNum(totalMarks, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <RowActionsMenu
                        mockSource={mock.source}
                        hasAnalysis={hasAnalysis}
                        onOpenAnalysis={() => onOpenAnalysis(mock.id)}
                        onEdit={() => onEditMock(mock.id)}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                  {expanded && (
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: rowBg }}>
                      <td colSpan={5} className="px-3 pb-3">
                        <div className="animate-fade-up flex flex-col gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 self-start px-2 py-1 text-xs"
                            style={{
                              background: hasAnalysis ? COLORS.surface : COLORS.surface2,
                              border: `1px solid ${hasAnalysis ? COLORS.good : COLORS.border}`,
                              borderRadius: 8,
                              color: hasAnalysis ? COLORS.good : COLORS.inkMuted,
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontWeight: 650,
                            }}
                          >
                            {hasAnalysis ? <FileCheck2 size={13} /> : <FilePlus2 size={13} />}
                            {analysisLabel(mock)}
                          </span>
                          <PerMockInsightsBlock mock={mock} settings={settings} priorMarks={priorMarks} compact />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

export default memo(MockLogTable);
