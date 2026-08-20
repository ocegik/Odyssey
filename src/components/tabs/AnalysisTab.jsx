import { useEffect, useMemo, useRef, useState } from "react";
import { Save, ClipboardList, Plus, Upload, Download, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../../constants";
import { fmtDate, fmtNum, fmtPct } from "../../lib/format";
import { buildAnalysisSummary, makeSampleDetailedAnalysis, normalizeDetailedAnalysis, OUTCOME_REASONS } from "../../lib/analysisModel";
import { getTopicNode, TOPIC_REGISTRY_VERSION } from "../../lib/topicRegistry";
import { mockTotalMarks } from "../../lib/compute";
import { reviewAnalysisAgainstMock } from "../../lib/analysisValidation";
import {
  blankBlockFor,
  cascadeBlockRanges,
  mockFormToPayload,
  mockToForm,
  renumberBlockNames,
  structureSummary,
  validateMockForm,
} from "../../lib/mockFormModel";
import { inputStyle, selectStyle } from "../ui/FieldLabel";
import EmptyState from "../ui/EmptyState";
import SectionBadge from "../ui/SectionBadge";
import StatCard from "../ui/StatCard";
import PerMockInsightsBlock from "../PerMockInsightsBlock";
import TopicPicker from "../topics/TopicPicker";

const clone = (value) => (value ? JSON.parse(JSON.stringify(value)) : null);
const tempId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const DRAFT_STORAGE_PREFIX = "cat-mock-tracker:analysis-draft:";

function loadPendingDraft(mock) {
  try {
    const raw = localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${mock.id}`);
    return raw ? normalizeDetailedAnalysis(JSON.parse(raw), mock.analysis) : null;
  } catch {
    return null;
  }
}

function savePendingDraft(mockId, draft) {
  try {
    localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${mockId}`, JSON.stringify(draft));
  } catch {
    // The current page still works if browser storage is unavailable.
  }
}

function clearPendingDraft(mockId) {
  try {
    localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${mockId}`);
  } catch {
    // No-op when browser storage is unavailable.
  }
}

function Panel({ title, children, action, id }) {
  return (
    <div id={id} className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
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
    result: "Unreviewed",
    outcomeReason: "",
    questionType: "MCQ",
    topic: "",
    topicRef: null,
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
        topicRef: null,
        questions: Array.from({ length: Math.max(0, end - start + 1) }, (_, questionIdx) => defaultQuestion(start + questionIdx, sectionName)),
      };
    });
    sections[sectionName] = {
      section: sectionName,
      id: tempId("s"),
      createdAt: Date.now(),
      percentile: sectionData.percentile ?? null,
      notes: "",
      blocks,
    };
  });

  return {
    sourceFormat: "in-app-structured-analysis",
    mockName: mock.source,
    date: mock.date,
    overallReflection: "",
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

function mockFromStructurePayload(mock, payload) {
  const sectionPatches = {};
  payload.sections.forEach((section) => {
    sectionPatches[section.section] = {
      ...(mock[section.section] || {}),
      section: section.section,
      manualTotalMarks: section.manualTotalMarks,
      totalMarks: section.manualTotalMarks,
      totalQuestions: section.totalQuestions,
      attempted: section.attempted ?? null,
      correct: section.correct ?? null,
      percentile: section.percentile ?? null,
      notes: section.notes || "",
      questionSetCount: section.questionSetCount,
      questionBlocks: section.questionBlocks,
    };
  });

  return {
    ...mock,
    date: payload.date,
    source: payload.source,
    manualTotalMarks: payload.totalMarks,
    ...sectionPatches,
  };
}

function mergeDraftOntoMockStructure(mock, currentDraft) {
  const next = buildAnalysisDraftFromMock(mock);
  if (!currentDraft) return next;

  return {
    ...next,
    id: currentDraft.id,
    createdAt: currentDraft.createdAt,
    updatedAt: currentDraft.updatedAt,
    sourceFormat: currentDraft.sourceFormat || next.sourceFormat,
    mockName: currentDraft.mockName || next.mockName,
    date: currentDraft.date || next.date,
    overallReflection: currentDraft.overallReflection || "",
    sections: SECTIONS.reduce((acc, sectionName) => {
      const nextSection = next.sections[sectionName];
      if (!nextSection) return acc;
      const priorSection = currentDraft.sections?.[sectionName];
      const priorQuestions = new Map(
        (priorSection?.blocks || [])
          .flatMap((block) => block.questions || [])
          .map((question) => [Number(question.questionNumber), question])
      );
      const priorBlocks = priorSection?.blocks || [];

      acc[sectionName] = {
        ...nextSection,
        id: priorSection?.id || nextSection.id,
        createdAt: priorSection?.createdAt || nextSection.createdAt,
        notes: priorSection?.notes || "",
        blocks: nextSection.blocks.map((block) => {
          const priorBlock = priorBlocks.find((candidate) => candidate.id === block.id)
            || priorBlocks.find((candidate) => candidate.name === block.name && candidate.type === block.type);
          return {
            ...block,
            topic: priorBlock?.topic || block.topic || "",
            topicRef: priorBlock?.topicRef || block.topicRef || null,
            questions: block.questions.map((question) => {
              const priorQuestion = priorQuestions.get(Number(question.questionNumber));
              return priorQuestion ? { ...question, ...priorQuestion, questionNumber: question.questionNumber } : question;
            }),
          };
        }),
      };
      return acc;
    }, {}),
  };
}

function SectionSummary({ section, summary, expanded, onToggle }) {
  if (!summary) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={`analysis-section-${section}`}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${section} questions`}
      className="theme-hover p-3 flex flex-col gap-2 text-left"
      style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface2, color: COLORS.ink, cursor: "pointer" }}
    >
      <div className="flex items-center justify-between gap-2">
        <SectionBadge section={section} size="sm" />
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: COLORS.inkMuted }}>
          {summary.unreviewed > 0
            ? `${summary.totalQuestions - summary.unreviewed}/${summary.totalQuestions} reviewed`
            : `${summary.totalQuestions} Qs`}
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
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
    </button>
  );
}

function ReviewField({ label, children, className = "", style }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`} style={style}>
      <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</span>
      {children}
    </label>
  );
}

function QuestionReviewRow({
  section,
  blockIdx,
  question,
  questionIdx,
  isSet,
  topicHeader,
  setQuestion,
  setQuestionTopic,
}) {
  const reviewed = question.result !== "Unreviewed";
  const fieldGrid = isSet ? "xl:grid-cols-3" : "xl:grid-cols-4";
  const notesSpan = isSet ? "sm:col-span-2 xl:col-span-3" : "sm:col-span-2 xl:col-span-4";
  const resultTone = {
    Unreviewed: COLORS.inkMuted,
    Correct: COLORS.good,
    Wrong: COLORS.danger,
    Skipped: COLORS.warn,
  }[question.result] || COLORS.inkMuted;

  const resultSelectStyle = {
    ...selectStyle(false),
    height: 40,
    fontSize: 14,
    borderColor: resultTone,
    color: resultTone,
    fontWeight: 700,
  };
  const detailStyle = {
    opacity: reviewed ? 1 : 0.46,
    transition: "opacity 140ms ease",
  };

  return (
    <div
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-3"
      style={{
        background: reviewed ? COLORS.surface : COLORS.surface2,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${resultTone}`,
        borderRadius: 8,
      }}
    >
      <div className="flex flex-col items-center gap-0.5 justify-start pt-1" style={{ color: COLORS.inkMuted }}>
        <span style={{ ...TYPE.label, fontSize: 10 }}>Q</span>
        <strong style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace" }}>{question.questionNumber}</strong>
      </div>
      <div className={`grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 ${fieldGrid}`}>
        <ReviewField label="Result">
          <select value={question.result} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "result", ev.target.value)} style={resultSelectStyle}>
            {["Unreviewed", "Correct", "Wrong", "Skipped"].map((result) => <option key={result}>{result}</option>)}
          </select>
        </ReviewField>
        <ReviewField label="Type" style={detailStyle}>
          <select disabled={!reviewed} value={question.questionType} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "questionType", ev.target.value)} style={{ ...selectStyle(false), height: 38, fontSize: 13 }}>
            {["MCQ", "TITA"].map((type) => <option key={type}>{type}</option>)}
          </select>
        </ReviewField>
        {!isSet && (
          <ReviewField label={topicHeader} style={detailStyle}>
            <TopicPicker
              section={section}
              topicRef={question.topicRef}
              legacyTopic={question.topic}
              onChange={setQuestionTopic(section, blockIdx, questionIdx)}
              selectStyle={selectStyle}
              compact
              disabled={!reviewed}
            />
          </ReviewField>
        )}
        <ReviewField label="Outcome reason" style={detailStyle}>
          <select disabled={!reviewed} value={question.outcomeReason} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "outcomeReason", ev.target.value)} style={{ ...selectStyle(false), height: 38, fontSize: 13 }}>
            {(OUTCOME_REASONS[section]?.[question.result] || []).map((reason) => <option key={reason} value={reason}>{reason}</option>)}
          </select>
        </ReviewField>
        <ReviewField label="Time (seconds)" style={detailStyle}>
          <input disabled={!reviewed} type="number" min="0" value={question.timeTaken ?? ""} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "timeTaken", ev.target.value === "" ? null : Number(ev.target.value))} title={seconds(question.timeTaken)} style={{ ...inputStyle(false), height: 38, fontSize: 13 }} />
        </ReviewField>
        <ReviewField label="Average time (seconds)" style={detailStyle}>
          <input disabled={!reviewed} type="number" min="0" value={question.averageTime ?? ""} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "averageTime", ev.target.value === "" ? null : Number(ev.target.value))} title={seconds(question.averageTime)} style={{ ...inputStyle(false), height: 38, fontSize: 13 }} />
        </ReviewField>
        <ReviewField label="Notes" className={notesSpan} style={detailStyle}>
          <input disabled={!reviewed} value={question.notes} onChange={(ev) => setQuestion(section, blockIdx, questionIdx, "notes", ev.target.value)} style={{ ...inputStyle(false), height: 38, fontSize: 13 }} />
        </ReviewField>
      </div>
    </div>
  );
}

// This editor is rendered inside the expanded row for its mock. Keeping the
// complete editor in one component preserves its import, structure, review,
// and insights behavior without reintroducing a second mock-selection step.
export default function AnalysisTab({ mock: selectedMock, mocks, settings, onSaveAnalysis, onEditMock }) {
  const [draft, setDraft] = useState(null);
  const [analysisNotices, setAnalysisNotices] = useState([]);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [structureForm, setStructureForm] = useState(null);
  const [structureErrors, setStructureErrors] = useState([]);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const importFileInputRef = useRef(null);

  // Switching to a different mock resets all feedback from whatever was
  // happening on the previous one.
  useEffect(() => {
    setAnalysisNotices([]);
    setSaveError("");
    setSaveMessage("");
    setExpandedSections(new Set());
  }, [selectedMock?.id]);

  // Resyncs the draft whenever the canonical saved analysis changes — either
  // from switching mocks or from our own save landing (attachAnalysis gives
  // back a freshly normalized object, a new reference every time). Kept
  // separate from the reset above so a successful save's notices/confirmation
  // survive this re-render instead of being wiped by their own save.
  useEffect(() => {
    if (!selectedMock) {
      setDraft(null);
      setStructureForm(null);
      return;
    }
    setDraft(loadPendingDraft(selectedMock) || clone(selectedMock.analysis) || buildAnalysisDraftFromMock(selectedMock));
    setStructureForm(mockToForm(selectedMock));
    setImportMessage("");
    setImportError("");
  }, [selectedMock?.id, selectedMock?.analysis]);

  // Analysis now lives on an addressable page, so preserve in-progress edits
  // across route changes and reloads until the person explicitly saves them.
  useEffect(() => {
    if (selectedMock && draft) savePendingDraft(selectedMock.id, draft);
  }, [selectedMock?.id, draft]);

  useEffect(() => {
    if (!selectedMock) return;
    setStructureForm(mockToForm(selectedMock));
    setStructureErrors([]);
  }, [selectedMock]);

  const applyImportedAnalysis = (raw) => {
    if (!selectedMock) return;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      setDraft(normalizeDetailedAnalysis(parsed, selectedMock.analysis));
      setAnalysisNotices([]);
      setSaveError("");
      setImportError("");
      setImportMessage("Analysis JSON imported — review below, then save.");
    } catch (err) {
      setImportError(err.message || "Could not import that analysis JSON.");
      setImportMessage("");
    }
  };

  const handleImportFile = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyImportedAnalysis(reader.result);
    reader.readAsText(file);
  };

  const applyPastedJson = () => {
    applyImportedAnalysis(pasteValue);
  };

  const downloadTemplate = () => {
    if (!selectedMock) return;
    const template = makeSampleDetailedAnalysis(selectedMock);
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedMock.source || "mock"}-analysis-template.json`.replace(/\s+/g, "-").toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  const setOverall = (field) => (ev) => {
    const value = ev.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setStructureSectionField = (sectionIdx, field) => (ev) => {
    const value = ev.target.value;
    setStructureForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => (
        idx === sectionIdx ? { ...section, [field]: value } : section
      )),
    }));
  };

  const setStructureBlockField = (sectionIdx, blockIdValue, field) => (ev) => {
    const value = ev.target.value;
    setStructureForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => {
        if (idx !== sectionIdx) return section;

        if (field === "startQuestion" || field === "endQuestion") {
          return { ...section, questionBlocks: cascadeBlockRanges(section.questionBlocks, blockIdValue, field, Number(value)) };
        }

        const updatedBlocks = section.questionBlocks.map((block) => (
          block.id === blockIdValue ? { ...block, [field]: value } : block
        ));
        return { ...section, questionBlocks: field === "type" ? renumberBlockNames(updatedBlocks, blockIdValue) : updatedBlocks };
      }),
    }));
  };

  const addStructureBlock = (sectionIdx, type) => {
    setStructureForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => {
        if (idx !== sectionIdx) return section;
        const newBlock = blankBlockFor(section, type);
        return { ...section, questionBlocks: renumberBlockNames([...section.questionBlocks, newBlock], newBlock.id) };
      }),
    }));
  };

  const removeStructureBlock = (sectionIdx, blockIdValue) => {
    setStructureForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => (
        idx === sectionIdx
          ? { ...section, questionBlocks: renumberBlockNames(section.questionBlocks.filter((block) => block.id !== blockIdValue)) }
          : section
      )),
    }));
  };

  const cancelStructureEdit = () => {
    if (selectedMock) setStructureForm(mockToForm(selectedMock));
    setStructureErrors([]);
    setShowStructureEditor(false);
  };

  const saveStructureEdit = () => {
    if (!selectedMock || !structureForm) return;
    const errors = validateMockForm(structureForm);
    setStructureErrors(errors);
    if (errors.length > 0) return;

    const payload = mockFormToPayload(structureForm);
    const patchedMock = mockFromStructurePayload(selectedMock, payload);
    onEditMock(selectedMock.id, payload);
    setDraft((current) => mergeDraftOntoMockStructure(patchedMock, current));
    setAnalysisNotices([]);
    setSaveError("");
    setSaveMessage("Paper structure updated. Existing answers were kept by question number; save analysis when ready.");
    setShowStructureEditor(false);
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

  const setQuestionTopic = (section, blockIdx, questionIdx) => (topicId) => {
    setDraft((current) => {
      const blocks = current.sections[section].blocks.map((block, bIdx) => {
        if (bIdx !== blockIdx) return block;
        return {
          ...block,
          questions: block.questions.map((question, qIdx) => (
            qIdx === questionIdx
              ? {
                  ...question,
                  topic: topicId ? getTopicNode(topicId)?.name || "" : "",
                  topicRef: topicId ? { topicId, source: "user", taxonomyVersion: TOPIC_REGISTRY_VERSION } : null,
                }
              : question
          )),
        };
      });
      return { ...current, sections: { ...current.sections, [section]: { ...current.sections[section], blocks } } };
    });
  };

  const setBlockTopic = (section, blockIdx) => (topicId) => {
    setDraft((current) => {
      const blocks = current.sections[section].blocks.map((block, bIdx) => (
        bIdx === blockIdx
          ? {
              ...block,
              topic: topicId ? getTopicNode(topicId)?.name || "" : "",
              topicRef: topicId ? { topicId, source: "user", taxonomyVersion: TOPIC_REGISTRY_VERSION } : null,
            }
          : block
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

  const toggleSection = (section) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const regenerateDraft = () => {
    if (!selectedMock) return;
    if (selectedMock.analysis) {
      const confirmed = window.confirm(
        "Regenerate this analysis? Existing answers, reasons, timings, and notes will be removed."
      );
      if (!confirmed) return;
    }
    setDraft(buildAnalysisDraftFromMock(selectedMock));
    setAnalysisNotices([]);
    setSaveError("");
    setSaveMessage("");
  };

  /**
   * Always persists the draft as-is, however complete it is — reviewAnalysisAgainstMock
   * only returns informational notices (in-progress sections, structure/score
   * mismatches), never a reason to block. This is what lets a mock go from
   * "12 of 22 reviewed" to fully reviewed across several sittings without
   * ever losing what's already been entered.
   */
  const saveDraft = () => {
    if (!selectedMock || !draft) return;
    setAnalysisNotices(reviewAnalysisAgainstMock(selectedMock, draft));
    const saved = onSaveAnalysis(selectedMock.id, draft);
    if (saved === false) {
      setSaveError("Could not save this analysis. Check the analysis data and try again.");
      setSaveMessage("");
    } else {
      clearPendingDraft(selectedMock.id);
      setSaveError("");
      setSaveMessage("Saved.");
    }
  };

  const summary = useMemo(
    () => (draft ? buildAnalysisSummary(draft.sections || {}) : selectedMock?.analysis?.summary),
    [draft, selectedMock?.analysis?.summary]
  );

  if (!selectedMock) {
    return <EmptyState icon={ClipboardList} title="Mock unavailable" body="This mock is no longer available. Collapse the row and choose another mock." />;
  }

  const mockForInsights = selectedMock && draft ? { ...selectedMock, analysis: { ...draft, summary } } : selectedMock;
  // mocks is sorted oldest-first, so the entry right before the selected one is its prior mock.
  const selectedMockIndex = mocks.findIndex((mock) => mock.id === selectedMock?.id);
  const priorMarks = selectedMockIndex > 0 ? mockTotalMarks(mocks[selectedMockIndex - 1]) : null;
  const visibleStats = [
    <StatCard key="questions" label="Questions" value={summary?.totalQuestions || 0} />,
    <StatCard
      key="unreviewed"
      label="Unreviewed"
      value={summary?.unreviewed || 0}
      sub={summary?.unreviewed > 0 ? "Save works anytime — fill these in whenever you remember" : undefined}
    />,
  ];
  if ((summary?.attempted || 0) > 0) visibleStats.push(<StatCard key="accuracy" label="Accuracy" value={fmtPct(summary?.accuracy)} />);
  if ((summary?.wrong || 0) > 0) visibleStats.push(<StatCard key="wrong" label="Wrong" value={summary.wrong} />);
  if ((summary?.skipped || 0) > 0) visibleStats.push(<StatCard key="skipped" label="Skipped" value={summary.skipped} />);
  if ((summary?.timedQuestions || 0) > 0) visibleStats.push(<StatCard key="time" label="Avg time/question" value={seconds(summary.averageTime)} />);
  const statGridColumns = visibleStats.length <= 2 ? "sm:grid-cols-2" : visibleStats.length <= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3 xl:grid-cols-6";

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
        <span className="text-sm" style={{ color: COLORS.inkMuted }}>
          <strong style={{ color: COLORS.ink }}>{selectedMock.source}</strong> · {fmtDate(selectedMock.date)} · {SECTIONS.filter((section) => selectedMock[section]).length} sections
        </span>
      </div>

      {!draft && (
        <EmptyState icon={ClipboardList} title="No analysis draft" body="Generate an analysis from this mock's saved structure." />
      )}

      {draft && (
        <div className="animate-fade-up flex flex-col gap-4">
          <div className={`grid grid-cols-2 gap-3 ${statGridColumns}`}>
            {visibleStats}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SECTIONS.map((section) => (
              <SectionSummary
                key={section}
                section={section}
                summary={summary?.sections?.[section]}
                expanded={expandedSections.has(section)}
                onToggle={() => toggleSection(section)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-2.5" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}` }}>
              <div className="flex flex-wrap gap-2">
                <input ref={importFileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-black/[0.04]"
                  style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
                >
                  <Upload size={14} />
                  Import JSON
                </button>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-black/[0.04]"
                  style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
                >
                  <Download size={14} />
                  Download template
                </button>
              </div>
              {selectedMock?.analysis && (
                <button
                  type="button"
                  onClick={regenerateDraft}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm hover:opacity-90"
                  style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                >
                  <Plus size={14} />
                  Regenerate
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPasteImport((v) => !v)}
              className="theme-hover self-start inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs -mt-1"
              style={{ borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
            >
              {showPasteImport ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {showPasteImport ? "Hide paste JSON" : "Paste JSON instead of uploading a file"}
            </button>
            {showPasteImport && (
              <div className="animate-fade-up flex flex-col gap-2">
                <textarea
                  value={pasteValue}
                  onChange={(ev) => setPasteValue(ev.target.value)}
                  rows={6}
                  placeholder="Paste analysis JSON here"
                  style={{ ...inputStyle(false), resize: "vertical", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}
                />
                <button
                  type="button"
                  onClick={applyPastedJson}
                  className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:opacity-90"
                  style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
                >
                  <Upload size={14} />
                  Apply pasted JSON
                </button>
              </div>
            )}
            {importError && (
              <div className="p-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8 }}>
                {importError}
              </div>
            )}
            {importMessage && !importError && <p className="text-sm" style={{ color: COLORS.good }}>{importMessage}</p>}
            <label className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: COLORS.surface2 }}>
              <span className="text-sm" style={{ color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Overall reflection</span>
              <textarea
                value={draft.overallReflection}
                onChange={setOverall("overallReflection")}
                rows={3}
                placeholder="What will you repeat or change next mock?"
                style={{ ...inputStyle(false), backgroundColor: "transparent", border: "none", borderRadius: 0, padding: 0, resize: "vertical", minHeight: 82 }}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStructureEditor((value) => !value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-black/[0.04]"
                style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
              >
                <Pencil size={14} />
                Paper structure
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:opacity-90"
                style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
              >
                <Save size={14} />
                Save analysis
              </button>
            </div>
            {showStructureEditor && structureForm && (
              <div className="animate-fade-up p-4 flex flex-col gap-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <h4 style={TYPE.chartTitle}>Edit Paper Structure</h4>
                    <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
                      Update score, total questions, attempted/correct counts, and set ranges for this logged mock.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelStructureEdit}
                    className="theme-hover inline-flex items-center justify-center"
                    style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.inkMuted }}
                    aria-label="Close paper structure editor"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {structureForm.sections.map((section, sectionIdx) => (
                    <div key={section.section} className="p-3 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          <SectionBadge section={section.section} size="sm" />
                          <span className="text-xs" style={{ color: COLORS.inkMuted }}>{structureSummary(section)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                          <div className="flex flex-col gap-1.5">
                            <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Score</label>
                            <input type="number" value={section.score} onChange={setStructureSectionField(sectionIdx, "score")} style={{ ...inputStyle(false), width: 110 }} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Total Qs</label>
                            <input type="number" min="1" value={section.totalQuestions} onChange={setStructureSectionField(sectionIdx, "totalQuestions")} style={{ ...inputStyle(false), width: 110 }} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Attempted</label>
                            <input type="number" min="0" placeholder="-" value={section.attempted} onChange={setStructureSectionField(sectionIdx, "attempted")} style={{ ...inputStyle(false), width: 100 }} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Correct</label>
                            <input type="number" min="0" placeholder="-" value={section.correct} onChange={setStructureSectionField(sectionIdx, "correct")} style={{ ...inputStyle(false), width: 100 }} />
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                        <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 860 }}>
                          <thead>
                            <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
                              {["Type", "Name", "Start Q", "End Q", ""].map((label) => (
                                <th key={label} className="text-left px-3 py-2.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.questionBlocks.map((block) => (
                              <tr key={block.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                <td className="px-3 py-2.5">
                                  <select value={block.type} onChange={setStructureBlockField(sectionIdx, block.id, "type")} style={{ ...selectStyle(false), minWidth: 150, height: 40, fontSize: 14 }}>
                                    <option value="set">Set</option>
                                    <option value="independent">Independent</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2.5">
                                  <input value={block.name} onChange={setStructureBlockField(sectionIdx, block.id, "name")} style={{ ...inputStyle(false), minWidth: 240, height: 40, fontSize: 14 }} />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input type="number" min="1" value={block.startQuestion} onChange={setStructureBlockField(sectionIdx, block.id, "startQuestion")} style={{ ...inputStyle(false), width: 110, height: 40, fontSize: 14 }} />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input type="number" min="1" value={block.endQuestion} onChange={setStructureBlockField(sectionIdx, block.id, "endQuestion")} style={{ ...inputStyle(false), width: 110, height: 40, fontSize: 14 }} />
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <button type="button" onClick={() => removeStructureBlock(sectionIdx, block.id)} className="theme-hover inline-flex items-center justify-center" style={{ width: 40, height: 40, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.danger }}>
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => addStructureBlock(sectionIdx, "set")} className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink }}>
                          <Plus size={13} /> Add set
                        </button>
                        <button type="button" onClick={() => addStructureBlock(sectionIdx, "independent")} className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink }}>
                          <Plus size={13} /> Add independent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {structureErrors.length > 0 && (
                  <div className="p-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8 }}>
                    {structureErrors.map((error) => <div key={error}>{error}</div>)}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button type="button" onClick={saveStructureEdit} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm hover:opacity-90" style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
                    <Save size={14} />
                    Save structure
                  </button>
                  <button type="button" onClick={cancelStructureEdit} className="theme-hover inline-flex items-center gap-1.5 px-4 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {saveError && (
              <div className="p-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8 }}>
                {saveError}
              </div>
            )}
            {saveMessage && !saveError && <p className="text-sm" style={{ color: COLORS.good }}>{saveMessage}</p>}
            {analysisNotices.map((notice, idx) => (
              <div
                key={`${notice.section}-${idx}`}
                className="p-3 text-sm"
                style={{
                  background: notice.tone === "warn" ? COLORS.warnSoft : COLORS.infoSoft,
                  color: notice.tone === "warn" ? COLORS.warn : COLORS.info,
                  borderRadius: 8,
                }}
              >
                {notice.text}
              </div>
            ))}
            <PerMockInsightsBlock mock={mockForInsights} settings={settings} priorMarks={priorMarks} />
          </div>

          {SECTIONS.map((section) => {
            const sectionAnalysis = draft.sections?.[section];
            if (!sectionAnalysis || !expandedSections.has(section)) return null;
            return (
              <Panel key={section} id={`analysis-section-${section}`} title={`${section} questions`}>
                <label className="flex flex-col gap-1.5">
                  <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>{section} notes</span>
                  <textarea
                    value={sectionAnalysis.notes}
                    onChange={setSectionNotes(section)}
                    rows={2}
                    placeholder={`Patterns or reminders for ${section}`}
                    style={{ ...inputStyle(false), resize: "vertical" }}
                  />
                </label>
                <div className="flex flex-col gap-4">
                  {sectionAnalysis.blocks.map((block, blockIdx) => {
                    const isSet = block.type === "set";
                    const topicHeader = section === "VARC" ? "Passage Domain" : "Topic";
                    return (
                    <div key={block.id} className="flex flex-col gap-3 p-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <SectionBadge section={section} size="sm" />
                        <span className="text-sm" style={{ fontWeight: 650 }}>{block.name || block.type}</span>
                        <span className="text-xs" style={{ color: COLORS.inkMuted }}>{block.questions.length} Qs</span>
                        {isSet && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-xs" style={{ color: COLORS.inkMuted }}>{section === "VARC" ? "Passage Domain:" : "Set topic:"}</span>
                            <TopicPicker
                              section={section}
                              topicRef={block.topicRef}
                              legacyTopic={block.topic}
                              onChange={setBlockTopic(section, blockIdx)}
                              selectStyle={selectStyle}
                              compact
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {block.questions.map((question, questionIdx) => (
                          <QuestionReviewRow
                            key={question.id}
                            section={section}
                            blockIdx={blockIdx}
                            question={question}
                            questionIdx={questionIdx}
                            isSet={isSet}
                            topicHeader={topicHeader}
                            setQuestion={setQuestion}
                            setQuestionTopic={setQuestionTopic}
                          />
                        ))}
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
