import { ArrowLeft, ClipboardList } from "lucide-react";
import { COLORS, SECTIONS, SHADOW, TYPE } from "../../constants";
import { fmtDate, fmtNum } from "../../lib/format";
import { mockTotalMarks } from "../../lib/compute";
import AnalysisTab from "../tabs/AnalysisTab";
import EmptyState from "../ui/EmptyState";
import SectionBadge from "../ui/SectionBadge";

export default function MockAnalysisPage({
  mockId,
  mocks,
  settings,
  syncStatus,
  onSaveAnalysis,
  onEditMock,
  onBack,
}) {
  const mock = mocks.find((item) => item.id === mockId);

  if (!mock) {
    if (syncStatus === "loading") {
      return <div className="grid min-h-[240px] place-items-center text-sm" style={{ color: COLORS.inkMuted }}>Loading mock analysis…</div>;
    }

    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="theme-hover inline-flex w-fit items-center gap-1.5 px-3 py-1.5 text-sm"
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
        >
          <ArrowLeft size={14} />
          Back to mocks
        </button>
        <EmptyState icon={ClipboardList} title="Mock not found" body="This analysis link may be outdated, or the mock has been deleted." />
      </div>
    );
  }

  const sections = SECTIONS.filter((section) => mock[section]);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="theme-hover inline-flex w-fit items-center gap-1.5 px-3 py-1.5 text-sm"
        style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
      >
        <ArrowLeft size={14} />
        Back to mocks
      </button>

      <div className="flex flex-col gap-3 p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p style={TYPE.panelTitle}>Mock analysis</p>
            <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>
              {mock.source} · {fmtDate(mock.date)}
            </p>
          </div>
          <span className="text-sm" style={{ color: COLORS.inkMuted }}>
            Overall marks <strong style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(mockTotalMarks(mock), 0)}</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {sections.map((section) => (
            <span key={section} className="inline-flex items-center gap-1.5 text-sm">
              <SectionBadge section={section} size="sm" />
              <span style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 650 }}>{fmtNum(mock[section]?.totalMarks, 0)}</span>
            </span>
          ))}
        </div>
      </div>

      <AnalysisTab
        mock={mock}
        mocks={mocks}
        settings={settings}
        onSaveAnalysis={onSaveAnalysis}
        onEditMock={onEditMock}
      />
    </div>
  );
}
