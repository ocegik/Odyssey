import { useEffect, useMemo, useState } from "react";
import { Save, ClipboardList, Plus } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../../constants";
import { fmtDate, fmtNum, fmtPct } from "../../lib/format";
import { buildAnalysisSummary, OUTCOME_REASONS, TOPIC_OPTIONS } from "../../lib/analysisModel";
import { mockTotalMarks } from "../../lib/compute";
import { validateAnalysisAgainstMock } from "../../lib/analysisValidation";
import { inputStyle } from "../ui/FieldLabel";
import EmptyState from "../ui/EmptyState";
import SectionBadge from "../ui/SectionBadge";
import StatCard from "../ui/StatCard";
import PerMockInsightsBlock from "../PerMockInsightsBlock";

const clone = (value) => (value ? JSON.parse(JSON.stringify(value)) : null);
const tempId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function Panel({ title, children, action }) {
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center justify-between gap-3">
        <h3 style={TYPE.chartTitle}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function seconds(value) {
  return value === null || value === undefined ? "-" : `${fmtNum(value, 0)}s`;
}

function defaultQuestion(questionNumber, section) {
  return {
    id: tempId("q"),
    questionNumber,
    result: "Skipped",
    outcomeReason: OUTCOME_REASONS[section]?.Skipped?.[0] || "",
    questionType: "MCQ",
    topic: "",
    timeTaken: null,
    averageTime: null,
    notes: "",
  };
}

function fallbackBlocks(sectionData) {
  const totalQuestions = Number(sectionData?.totalQuestions || 0);
  if (Array.isArray(sectionData?.questionBlocks) && sectionData.questionBlocks.length > 0) {
    return sectionData.questionBlocks;
  }
  if (totalQuestions > 0) {
    return [{ type: "independent", name: "Questions", startQuestion: 1, endQuestion: totalQuestions }];
  }
  return [];
}

function buildAnalysisDraftFromMock(mock) {
  const sections = {};
  SECTIONS.forEach((sectionName) => {
    const sectionData = mock[sectionName] || mock.sections?.[sectionName];
    if (!sectionData) return;
    const blocks = fallbackBlocks(sectionData).map((block, idx) => {
      const start = Number(block.startQuestion || 1);
      const end = Number(block.endQuestion || start);
      return {
        id: block.id || tempId("b"),
        type: block.type || "independent",
        name: block.name || `${block.type === "set" ? "Set" : "Independent"} ${idx + 1}`,
        topic: "",
        questions: Array.from({ length: Math.max(0, end - start + 1) }, (_, questionIdx) => defaultQuestion(start + questionIdx, sectionName)),
      };
    });
    sections[sectionName] = {
      section: sectionName,
      id: tempId("s"),
      createdAt: Date.now(),
      percentile: sectionData.percentile ?? null,
      topperScore: sectionData.topperScore ?? null,
      notes: "",
      blocks,
    };
  });

  return {
    sourceFormat: "in-app-structured-analysis",
    mockName: mock.source,
    date: mock.date,
    overallReflection: "",
    overallPercentile: null,
    overallTopperScore: null,
    structureText: SECTIONS
      .filter((section) => sections[section])
      .map((section) => {
        const total = mock[section]?.totalQuestions ?? 0;
        return `${section}: ${total} questions`;
      })
      .join("\n"),
    sections,
  };
}

function SectionSummary({ section, summary }) {
  if (!summary) return null;
  return (
    <div className="p-3 flex flex-col gap-2" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface2 }}>
      <div className="flex items-center justify-between gap-2">
        <SectionBadge section={section} size="sm" />
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>{summary.totalQuestions} Qs</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: COLORS.inkMuted }}>
        <span>Accuracy: <strong style={{ color: COLORS.ink }}>{fmtPct(summary.accuracy)}</strong></span>
        <span>Skipped: <strong style={{ color: COLORS.ink }}>{summary.skipped}</strong></span>
        <span>Wrong: <strong style={{ color: COLORS.ink }}>{summary.wrong}</strong></span>
        <span>Slow: <strong style={{ color: COLORS.ink }}>{summary.slowQuestions}</strong></span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs pt-1" style={{ color: COLORS.inkMuted, borderTop: `1px solid ${COLORS.border}` }}>
        <span>Correct: <strong style={{ color: COLORS.ink }}>{summary.correct}</strong></span>
        <span>MCQ: <strong style={{ color: COLORS.ink }}>{summary.questionTypeCounts.MCQ || 0}</strong></span>
        <span>TITA: <strong style={{ color: COLORS.ink }}>{summary.questionTypeCounts.TITA || 0}</strong></span>
      </div>
    </div>
  );
}

export default function AnalysisTab({ mocks, selectedMockId, settings, onSelectMock, onSaveAnalysis }) {
  const selectedMock = useMemo(
    () => mocks.find((mock) => mock.id === selectedMockId) || mocks[0] || null,
    [mocks, selectedMockId]
  );
  const [draft, setDraft] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    const selectedExists = mocks.some((mock) => mock.id === selectedMockId);
    if (mocks[0] && (!selectedMockId || !selectedExists)) onSelectMock(mocks[0].id);
  }, [mocks, onSelectMock, selectedMockId]);

  useEffect(() => {
    if (!selectedMock) {
      setDraft(null);
      return;
    }
    setDraft(clone(selectedMock.analysis) || buildAnalysisDraftFromMock(selectedMock));
    setAnalysisError("");
  }, [selectedMock?.id, selectedMock?.analysis]);

  const setOverall = (field) => (ev) => {
    const value = ev.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setSectionNotes = (section) => (ev) => {
    const value = ev.target.value;
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [section]: { ...current.sections[section], notes: value },
      },
    }));
  };

  const setQuestion = (section, blockIdx, questionIdx, field, value) => {
    setDraft((current) => {
      const blocks = current.sections[section].blocks.map((block, bIdx) => {
        if (bIdx !== blockIdx) return block;
        return {
          ...block,
          questions: block.questions.map((question, qIdx) => {
            if (qIdx !== questionIdx) return question;
            if (field === "result") {
              return { ...question, result: value, outcomeReason: OUTCOME_REASONS[section]?.[value]?.[0] || "" };
            }
            return { ...question, [field]: value };
          }),
        };
      });
      return {
        ...current,
        sections: {
          ...current.sections,
          [section]: { ...current.sections[section], blocks },
        },
      };
    });
  };

  const setBlockTopic = (section, blockIdx) => (ev) => {
    const value = ev.target.value;
    setDraft((current) => {
      const blocks = current.sections[section].blocks.map((block, bIdx) => (
        bIdx === blockIdx ? { ...block, topic: value } : block
      ));
      return {
        ...current,
        sections: {
          ...current.sections,
          [section]: { ...current.sections[section], blocks },
        },
      };
    });
  };

  const regenerateDraft = () => {
    if (!selectedMock) return;
    if (selectedMock.analysis) {
      const confirmed = window.confirm(
        "Regenerate will discard the attached analysis for this mock (all logged results, reasons, times, and notes) and rebuild a blank question list. This can't be undone. Continue?"
      );
      if (!confirmed) return;
    }
    setDraft(buildAnalysisDraftFromMock(selectedMock));
    setAnalysisError("");
  };

  const saveDraft = () => {
    if (!selectedMock || !draft) return;
    const validationErrors = validateAnalysisAgainstMock(selectedMock, draft);
    if (validationErrors.length > 0) {
      setAnalysisError(validationErrors.join(" "));
      return;
    }
    const saved = onSaveAnalysis(selectedMock.id, draft);
    if (saved === false) {
      setAnalysisError("Could not save this analysis. Check the analysis data and try again.");
    } else {
      setAnalysisError("");
    }
  };

  const summary = useMemo(
    () => (draft ? buildAnalysisSummary(draft.sections || {}) : selectedMock?.analysis?.summary),
    [draft, selectedMock?.analysis?.summary]
  );

  if (mocks.length === 0) {
    return <EmptyState icon={ClipboardList} title="No mocks yet" body="Log a mock result first. Analysis will use that saved structure." />;
  }

  const mockForInsights = selectedMock && draft ? { ...selectedMock, analysis: { ...draft, summary } } : selectedMock;
  // mocks is sorted oldest-first, so the entry right before the selected one is its prior mock.
  const selectedMockIndex = mocks.findIndex((mock) => mock.id === selectedMock?.id);
  const priorMarks = selectedMockIndex > 0 ? mockTotalMarks(mocks[selectedMockIndex - 1]) : null;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Mock Analysis"
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={regenerateDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:opacity-90"
              style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
            >
              <Plus size={14} />
              {selectedMock?.analysis ? "Regenerate" : "Add Analysis"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
          <select
            value={selectedMock?.id || ""}
            onChange={(ev) => onSelectMock(ev.target.value)}
            style={{ ...inputStyle(false), fontFamily: "'Inter', sans-serif" }}
          >
            {mocks.map((mock) => (
              <option key={mock.id} value={mock.id}>
                {fmtDate(mock.date)} - {mock.source}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.inkMuted }}>
            <span>{selectedMock?.analysis ? "Analysis attached" : "Generated from mock log, not saved yet"}</span>
          </div>
        </div>
      </Panel>

      {!draft && (
        <EmptyState icon={ClipboardList} title="No analysis draft" body="Choose a mock to generate its question list from the saved mock log." />
      )}

      {draft && (
        <div className="animate-fade-up flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Questions" value={summary?.totalQuestions || 0} />
            <StatCard label="Accuracy" value={fmtPct(summary?.accuracy)} />
            <StatCard label="Wrong" value={summary?.wrong || 0} />
            <StatCard label="Skipped" value={summary?.skipped || 0} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Avg time/question" value={seconds(summary?.averageTime)} />
            <StatCard label="Avg benchmark" value={seconds(summary?.averageBenchmarkTime)} />
            <StatCard
              label="Total time vs benchmark"
              value={summary?.timeDelta === null || summary?.timeDelta === undefined ? "-" : `${summary.timeDelta >= 0 ? "+" : ""}${fmtNum(summary.timeDelta, 0)}s`}
              accent={summary?.timeDelta > 0 ? COLORS.danger : summary?.timeDelta < 0 ? COLORS.good : undefined}
            />
          </div>

          <Panel
            title={draft.mockName || selectedMock.source}
            action={
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:opacity-90"
                style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
              >
                <Save size={14} />
                Save analysis
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-sm" style={{ color: COLORS.inkMuted }}>
                Mock date: <strong style={{ color: COLORS.ink }}>{fmtDate(selectedMock.date)}</strong>
              </div>
              <div className="text-sm" style={{ color: COLORS.inkMuted }}>
                Logged total: <strong style={{ color: COLORS.ink }}>{fmtNum(selectedMock.manualTotalMarks, 0)}</strong>
              </div>
              <div className="text-sm" style={{ color: COLORS.inkMuted }}>
                Sections: <strong style={{ color: COLORS.ink }}>{SECTIONS.filter((section) => selectedMock[section]).length}</strong>
              </div>
            </div>
            {analysisError && (
              <div className="p-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8 }}>
                {analysisError}
              </div>
            )}
            <textarea
              value={draft.overallReflection}
              onChange={setOverall("overallReflection")}
              rows={3}
              placeholder="Overall reflection"
              style={{ ...inputStyle(false), resize: "vertical", minHeight: 82 }}
            />
            <PerMockInsightsBlock mock={mockForInsights} settings={settings} priorMarks={priorMarks} />
          </Panel>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SECTIONS.map((section) => (
              <SectionSummary key={section} section={section} summary={summary?.sections?.[section]} />
            ))}
          </div>

          {SECTIONS.map((section) => {
            const sectionAnalysis = draft.sections?.[section];
            if (!sectionAnalysis) return null;
            return (
              <Panel key={section} title={`${section} Analysis`}>
                <textarea
                  value={sectionAnalysis.notes}
                  onChange={setSectionNotes(section)}
                  rows={2}
                  placeholder={`${section} notes`}
                  style={{ ...inputStyle(false), resize: "vertical" }}
                />
                <div className="flex flex-col gap-4">
                  {sectionAnalysis.blocks.map((block, blockIdx) => {
                    const isSet = block.type === "set";
                    const headers = isSet
                      ? ["Q", "Result", "Outcome Reason", "Type", "Time", "Average Time", "Notes"]
                      : ["Q", "Result", "Outcome Reason", "Type", "Topic", "Time", "Average Time", "Notes"];
                    return (
                    <div key={block.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SectionBadge section={section} size="sm" />
                        <span className="text-sm" style={{ fontWeight: 650 }}>{block.name || block.type}</span>
                        <span className="text-xs" style={{ color: COLORS.inkMuted }}>{block.questions.length} Qs</span>
                        {isSet && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-xs" style={{ color: COLORS.inkMuted }}>Set topic:</span>
                            <select
                              value={block.topic || ""}
                              onChange={setBlockTopic(section, blockIdx)}
                              style={{ ...inputStyle(false), minWidth: 200, height: 36, fontSize: 13 }}
                            >
                              <option value="">-</option>
                              {(TOPIC_OPTIONS[section] || []).map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                        <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: isSet ? 1240 : 1440 }}>
                          <thead>
                            <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
                              {headers.map((label) => (
                                <th key={label} className="text-left px-3 py-2.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.questions.map((question, questionIdx) => (
                              <tr key={question.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                <td className="px-3 py-2.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{question.questionNumber}</td>
                                <td className="px-3 py-2.5">
                                  <select value={question.result} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "result", ev.target.value)} style={{ ...inputStyle(false), minWidth: 130, height: 40, fontSize: 14 }}>
                                    {["Correct", "Wrong", "Skipped"].map((result) => <option key={result}>{result}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <select value={question.outcomeReason} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "outcomeReason", ev.target.value)} style={{ ...inputStyle(false), minWidth: 240, height: 40, fontSize: 14 }}>
                                    {(OUTCOME_REASONS[section]?.[question.result] || []).map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <select value={question.questionType} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "questionType", ev.target.value)} style={{ ...inputStyle(false), minWidth: 110, height: 40, fontSize: 14 }}>
                                    {["MCQ", "TITA"].map((type) => <option key={type}>{type}</option>)}
                                  </select>
                                </td>
                                {!isSet && (
                                  <td className="px-3 py-2.5">
                                    <select value={question.topic || ""} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "topic", ev.target.value)} style={{ ...inputStyle(false), minWidth: 200, height: 40, fontSize: 14 }}>
                                      <option value="">-</option>
                                      {(TOPIC_OPTIONS[section] || []).map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                                    </select>
                                  </td>
                                )}
                                <td className="px-3 py-2.5">
                                  <input type="number" min="0" value={question.timeTaken ?? ""} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "timeTaken", ev.target.value === "" ? null : Number(ev.target.value))} title={seconds(question.timeTaken)} style={{ ...inputStyle(false), width: 120, height: 40, fontSize: 14 }} />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input type="number" min="0" value={question.averageTime ?? ""} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "averageTime", ev.target.value === "" ? null : Number(ev.target.value))} title={seconds(question.averageTime)} style={{ ...inputStyle(false), width: 140, height: 40, fontSize: 14 }} />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input value={question.notes} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "notes", ev.target.value)} style={{ ...inputStyle(false), minWidth: 360, height: 40, fontSize: 14 }} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
