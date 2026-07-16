import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../../constants";
import { buildDetailedAnalysisInsights, flattenAnalysisQuestions } from "../../lib/detailedAnalysisInsights";
import { fmtDate, fmtPct } from "../../lib/format";
import DetailedAnalysisInsightsPanel from "../DetailedAnalysisInsightsPanel";
import EmptyState from "../ui/EmptyState";

function Panel({ title, children, note }) {
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 style={TYPE.panelTitle}>{title}</h2>
        {note && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

function inc(counter, key) {
  const safeKey = key || "Unspecified";
  counter[safeKey] = (counter[safeKey] || 0) + 1;
}

function topEntry(counter) {
  const entry = Object.entries(counter || {}).sort((a, b) => b[1] - a[1])[0];
  return entry ? { label: entry[0], count: entry[1] } : null;
}

function analyzedRecentMocks(mocks, limit = 5) {
  return [...mocks]
    .filter((mock) => mock.analysis)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
    .slice(0, limit);
}

function buildRecentHighlights(mocks) {
  const recentMocks = analyzedRecentMocks(mocks);
  const questions = flattenAnalysisQuestions(recentMocks);
  const wrongReasons = {};
  const skippedReasons = {};
  const sectionWrong = {};

  questions.forEach((question) => {
    if (question.result === "Wrong") {
      inc(wrongReasons, question.outcomeReason);
      inc(sectionWrong, question.section);
    }
    if (question.result === "Skipped") inc(skippedReasons, question.outcomeReason);
  });

  const wrongCount = questions.filter((question) => question.result === "Wrong").length;
  const skippedCount = questions.filter((question) => question.result === "Skipped").length;
  const topWrong = topEntry(wrongReasons);
  const topSkipped = topEntry(skippedReasons);
  const topSectionWrong = topEntry(sectionWrong);

  return {
    recentMocks,
    questions,
    cards: [
      {
        label: "Recent mistake driver",
        value: topWrong?.label || "-",
        sub: topWrong ? `${topWrong.count}/${wrongCount} wrong questions in recent ${recentMocks.length} analyzed mocks (${fmtPct(topWrong.count / wrongCount)}).` : "No wrong-question reason signal yet.",
      },
      {
        label: "Recent skip driver",
        value: topSkipped?.label || "-",
        sub: topSkipped ? `${topSkipped.count}/${skippedCount} skipped questions in recent ${recentMocks.length} analyzed mocks (${fmtPct(topSkipped.count / skippedCount)}).` : "No skip reason signal yet.",
      },
      {
        label: "Section needing review",
        value: topSectionWrong?.label || "-",
        sub: topSectionWrong ? `${topSectionWrong.count} wrong questions came from ${topSectionWrong.label} recently.` : "No section-level mistake concentration yet.",
      },
    ],
  };
}

function RecentHighlights({ mocks }) {
  const highlights = useMemo(() => buildRecentHighlights(mocks), [mocks]);
  const range = highlights.recentMocks.length
    ? `${fmtDate(highlights.recentMocks[highlights.recentMocks.length - 1].date)} to ${fmtDate(highlights.recentMocks[0].date)}`
    : "";

  return (
    <Panel title="Recent 5 analyzed mocks" note={range}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {highlights.cards.map((card) => (
          <div key={card.label} className="p-4 flex flex-col gap-1.5" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
            <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>{card.label}</span>
            <strong style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16 }}>{card.value}</strong>
            <span className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>{card.sub}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SectionMistakeTrend({ analysis }) {
  return (
    <Panel title="Section-wise mistake type trend" note="Top wrong reasons by section across all analyzed mocks">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {analysis.reasonRows.map((row) => (
          <div key={row.section} className="p-4 flex flex-col gap-2" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
            <div className="flex items-center justify-between gap-2">
              <strong style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{row.section}</strong>
              <span className="text-xs" style={{ color: COLORS.inkMuted }}>{row.wrong} wrong</span>
            </div>
            {row.wrongReasons.length === 0 ? (
              <span className="text-sm" style={{ color: COLORS.inkMuted }}>No mistake reasons yet.</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {row.wrongReasons.slice(0, 3).map((reason) => (
                  <div key={reason.label} className="flex items-center justify-between gap-3 text-sm">
                    <span style={{ color: COLORS.ink }}>{reason.label}</span>
                    <span style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{reason.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function AnalysisInsightsDataTab({ mocks }) {
  const analysis = useMemo(() => buildDetailedAnalysisInsights(mocks), [mocks]);

  if (analysis.analyzedMockCount === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analysis data yet"
        body="Attach analysis details to a mock to unlock cross-mock mistake, skip, timing, and section-pattern insights."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Analysis Insights & Data" note={`${analysis.analyzedMockCount} analyzed ${analysis.analyzedMockCount === 1 ? "mock" : "mocks"}`}>
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Aggregate view of detailed analysis data across mocks: mistake reasons, skip reasons, timing patterns, and section-wise signals.
        </p>
      </Panel>

      <RecentHighlights mocks={mocks} />
      <SectionMistakeTrend analysis={analysis} />
      <DetailedAnalysisInsightsPanel mocks={mocks} />
    </div>
  );
}
