import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, FileCheck2, FilePlus2, Layers3, MoreVertical, Pencil, Search, Trash2 } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../constants";
import { fmtDate, fmtNum } from "../lib/format";
import { mockTotalMarks } from "../lib/compute";
import { inputStyle } from "./ui/FieldLabel";
import SectionBadge from "./ui/SectionBadge";
import EmptyState from "./ui/EmptyState";

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

function analysisStatus(analysis) {
  if (!analysis) {
    return { label: "No analysis yet", tone: COLORS.inkMuted, Icon: FilePlus2 };
  }

  const questions = Object.values(analysis.sections || {}).flatMap((section) =>
    (section?.blocks || []).flatMap((block) => block.questions || [])
  );
  const totalQuestions = Number(analysis.summary?.totalQuestions ?? questions.length);
  const unreviewed = Number(
    analysis.summary?.unreviewed
      ?? questions.filter((question) => question.result === "Unreviewed").length
  );

  if (totalQuestions > 0 && unreviewed === 0) {
    return { label: "Analysis complete", tone: COLORS.good, Icon: FileCheck2 };
  }

  if (totalQuestions > 0) {
    return {
      label: `Analysis: ${Math.max(0, totalQuestions - unreviewed)}/${totalQuestions} reviewed`,
      tone: COLORS.warn,
      Icon: FileCheck2,
    };
  }

  return { label: "Analysis started", tone: COLORS.info, Icon: FileCheck2 };
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
        className="mobile-tap-target theme-hover inline-flex items-center justify-center"
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

function MobileMockCard({ mock, onOpenAnalysis, onEdit, onDelete }) {
  const sectionNames = SECTIONS.filter((section) => mock[section]);
  const sectionMarks = sectionNames.reduce(
    (sum, section) => sum + (mock[section]?.totalMarks || 0),
    0,
  );
  const totalMarks = mock.manualTotalMarks ?? sectionMarks;
  const hasAnalysis = Boolean(mock.analysis);
  const status = analysisStatus(mock.analysis);
  const StatusIcon = status.Icon;

  const handleDelete = () => {
    if (window.confirm(`Delete "${mock.source}" (${fmtDate(mock.date)})? This can't be undone.`)) {
      onDelete(mock.id);
    }
  };

  return (
    <article
      className="interactive-row flex flex-col gap-3 p-3"
      role="link"
      tabIndex={0}
      aria-label={`Open analysis for ${mock.source}, ${fmtDate(mock.date)}`}
      onClick={() => onOpenAnalysis(mock.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpenAnalysis(mock.id);
      }}
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: SHADOW.card, cursor: "pointer" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm" style={{ color: COLORS.ink, fontWeight: 650 }}>{mock.source}</div>
          <div className="mt-0.5 text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(mock.date)}</div>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <RowActionsMenu
            mockSource={mock.source}
            hasAnalysis={hasAnalysis}
            onOpenAnalysis={() => onOpenAnalysis(mock.id)}
            onEdit={() => onEdit(mock)}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {sectionNames.map((section) => (
          <span key={section} className="inline-flex items-center gap-1.5 text-xs">
            <SectionBadge section={section} size="sm" />
            <span style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 650 }}>{fmtNum(mock[section]?.totalMarks, 0)}</span>
          </span>
        ))}
        <span className="ml-auto text-sm" style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNum(totalMarks, 0)}</span>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1" style={{ color: status.tone }}>
          <StatusIcon size={12} className="shrink-0" />
          <span className="truncate">{status.label}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5" style={{ color: COLORS.inkMuted, fontWeight: 600 }}>
          Open <ChevronRight size={13} />
        </span>
      </div>
    </article>
  );
}

function MockLogTable({
  mocks,
  onOpenAnalysis,
  onEditMock,
  onDeleteMock,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

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
    return <EmptyState icon={Layers3} title="No mocks yet" body="Log your first mock to get started." />;
  }

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
          {searchQuery ? `${rows.length} of ${mocks.length} mocks match` : `${rows.length} mock${rows.length === 1 ? "" : "s"} logged`}
        </span>
        <div className="relative w-full sm:w-auto">
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: COLORS.inkMuted, pointerEvents: "none" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(ev) => setSearchQuery(ev.target.value)}
            placeholder="Filter by source or date"
            className="w-full sm:w-[190px]"
            style={{ ...inputStyle(false), height: 36, paddingLeft: 28, paddingTop: 6, paddingBottom: 6, fontSize: 12.5 }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-4 text-center text-sm" style={{ background: COLORS.surface2, border: `1px dashed ${COLORS.border}`, borderRadius: 12, color: COLORS.inkMuted }}>
          No mocks match "{searchQuery}".
        </div>
      ) : (
      <>
      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((mock) => (
          <MobileMockCard
            key={mock.id}
            mock={mock}
            onOpenAnalysis={onOpenAnalysis}
            onEdit={onEditMock}
            onDelete={onDeleteMock}
          />
        ))}
      </div>
      <div className="table-scroll hidden sm:block" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: 640 }}>
          <thead>
            <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
                <SortableHeader label="Mock" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
              </th>
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted }}>Sections</th>
              <th className="px-3 py-2.5 text-left" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
                <SortableHeader label="Marks" active={sortKey === "marks"} dir={sortDir} onClick={() => toggleSort("marks")} />
              </th>
              <th className="px-3 py-2.5 text-right" style={{ ...TYPE.label, color: COLORS.inkMuted, width: 68 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((mock, i) => {
              const sectionNames = SECTIONS.filter((section) => mock[section]);
              const sectionMarks = sectionNames.reduce((sum, section) => sum + (mock[section]?.totalMarks || 0), 0);
              const totalMarks = mock.manualTotalMarks ?? sectionMarks;
              const hasAnalysis = Boolean(mock.analysis);
              const status = analysisStatus(mock.analysis);
              const StatusIcon = status.Icon;
              const rowBg = i % 2 ? COLORS.surface : COLORS.surface2;

              const handleDelete = () => {
                if (window.confirm(`Delete "${mock.source}" (${fmtDate(mock.date)})? This can't be undone.`)) {
                  onDeleteMock(mock.id);
                }
              };

              return (
                  <tr
                    key={mock.id}
                    className="interactive-row"
                    onClick={() => onOpenAnalysis(mock.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onOpenAnalysis(mock.id);
                    }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open analysis for ${mock.source}, ${fmtDate(mock.date)}`}
                    style={{ borderBottom: `1px solid ${COLORS.border}`, background: rowBg, cursor: "pointer" }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5" style={{ fontWeight: 650 }}>
                          {mock.source}
                        </span>
                        <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(mock.date)}</span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs" style={{ color: status.tone }}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-0.5 text-xs" style={{ color: COLORS.inkMuted, fontWeight: 600 }}>
                          Open analysis <ChevronRight size={13} />
                        </span>
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
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 650 }}>
                      {fmtNum(totalMarks, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ width: 68 }} onClick={(ev) => ev.stopPropagation()}>
                      <RowActionsMenu
                        mockSource={mock.source}
                        hasAnalysis={hasAnalysis}
                        onOpenAnalysis={() => onOpenAnalysis(mock.id)}
                        onEdit={() => onEditMock(mock.id)}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}

export default memo(MockLogTable);
