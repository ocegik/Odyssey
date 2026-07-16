import { Fragment, useMemo } from "react";
import { FileCheck2, FilePlus2, Layers3, Trash2 } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../constants";
import { fmtDate, fmtNum } from "../lib/format";
import SectionBadge from "./ui/SectionBadge";
import EmptyState from "./ui/EmptyState";
import PerMockInsightsBlock from "./PerMockInsightsBlock";

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

export default function MockLogTable({ mocks, settings, onOpenAnalysis, onDeleteMock }) {
  const rows = useMemo(
    () => [...mocks].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))),
    [mocks]
  );

  if (rows.length === 0) {
    return <EmptyState icon={Layers3} title="No mocks yet" body="Log a full mock from Add Analysis; optional detailed analysis can attach to that same mock." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
              {["Mock", "Sections", "Marks", "Analysis", "Actions"].map((label, idx) => (
                <th
                  key={label}
                  className={`px-3 py-2.5 ${idx === 4 ? "text-right" : "text-left"}`}
                  style={{ ...TYPE.label, color: COLORS.inkMuted }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((mock, i) => {
              const sectionNames = SECTIONS.filter((section) => mock[section]);
              const sectionMarks = sectionNames.reduce((sum, section) => sum + (mock[section]?.totalMarks || 0), 0);
              const totalMarks = mock.manualTotalMarks ?? sectionMarks;
              const hasAnalysis = Boolean(mock.analysis);
              const Icon = hasAnalysis ? FileCheck2 : FilePlus2;

              const handleDelete = () => {
                if (window.confirm(`Delete "${mock.source}" (${fmtDate(mock.date)})? This can't be undone.`)) {
                  onDeleteMock(mock.id);
                }
              };

              return (
                <Fragment key={mock.id}>
                  <tr className="hover:bg-black/[0.025]" style={{ borderBottom: hasAnalysis ? "none" : `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface : COLORS.surface2 }}>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span style={{ fontWeight: 650 }}>{mock.source}</span>
                        <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(mock.date)}</span>
                      </div>
                    </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {sectionNames.map((section) => (
                        <span key={section} className="inline-flex items-center gap-1.5">
                          <SectionBadge section={section} size="sm" />
                          <span className="text-xs" style={{ color: COLORS.inkMuted }}>{structureLabel(mock[section])}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 650 }}>
                      {fmtNum(totalMarks, 0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs"
                        style={{
                          background: hasAnalysis ? COLORS.surface : COLORS.surface2,
                          border: `1px solid ${hasAnalysis ? COLORS.good : COLORS.border}`,
                          borderRadius: 8,
                          color: hasAnalysis ? COLORS.good : COLORS.inkMuted,
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 650,
                        }}
                      >
                        <Icon size={13} />
                        {analysisLabel(mock)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onOpenAnalysis(mock.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-black/[0.04]"
                          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.ink, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
                        >
                          <Icon size={13} />
                          {hasAnalysis ? "Open analysis" : "Add analysis"}
                        </button>
                        <button
                          onClick={handleDelete}
                          aria-label={`Delete ${mock.source}`}
                          className="theme-hover inline-flex items-center justify-center"
                          style={{ width: 32, height: 32, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.danger }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {hasAnalysis && (
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface : COLORS.surface2 }}>
                      <td colSpan={5} className="px-3 pb-3">
                        <PerMockInsightsBlock mock={mock} settings={settings} compact />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
