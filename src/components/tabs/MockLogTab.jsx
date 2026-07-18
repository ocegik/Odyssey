import { useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../../constants";
import { validateSectionBlockCoverage } from "../../lib/mockModel";
import MockLogTable from "../MockLogTable";
import SectionBadge from "../ui/SectionBadge";
import { inputStyle } from "../ui/FieldLabel";

const today = () => new Date().toISOString().slice(0, 10);
const blockId = () => `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Shifts every block after the edited one so ranges stay contiguous, instead
    of leaving the user to retype each subsequent block's start/end by hand.
    Editing a block's end moves the next block's start (and, to preserve its
    size, its end too) — cascading all the way down the list. Editing a
    block's start only pulls in the previous block's end, since that's the
    one shared boundary it affects. */
function cascadeBlockRanges(blocks, editedId, field, newValue) {
  const editedIdx = blocks.findIndex((block) => block.id === editedId);
  if (editedIdx === -1) return blocks;

  const next = blocks.map((block) => ({ ...block }));
  next[editedIdx][field] = newValue;

  if (field === "endQuestion") {
    for (let i = editedIdx + 1; i < next.length; i += 1) {
      const size = Math.max(0, Number(next[i].endQuestion) - Number(next[i].startQuestion));
      const start = Number(next[i - 1].endQuestion) + 1;
      next[i].startQuestion = start;
      next[i].endQuestion = start + size;
    }
  } else if (field === "startQuestion" && editedIdx > 0) {
    next[editedIdx - 1].endQuestion = newValue - 1;
  }

  return next;
}

const isAutoBlockName = (name, type) => (type === "set" ? /^Set \d+$/.test(name) : name === "Independent Questions");

/** Keeps "Set N" labels in sync with a block's position/type — e.g. flipping
    a block between set/independent, or deleting one, used to leave stale or
    duplicate numbers behind. `forceRenameId`, if given, always gets the
    fresh auto name regardless of what it was called before (used right after
    a type toggle so that block updates even if its old name looked custom). */
function renumberBlockNames(blocks, forceRenameId) {
  let setCount = 0;
  return blocks.map((block) => {
    if (block.type === "set") {
      setCount += 1;
      if (block.id === forceRenameId || isAutoBlockName(block.name, "set")) {
        return { ...block, name: `Set ${setCount}` };
      }
      return block;
    }
    if (block.id === forceRenameId || isAutoBlockName(block.name, "independent")) {
      return { ...block, name: "Independent Questions" };
    }
    return block;
  });
}

const DEFAULT_SECTIONS = [
  {
    section: "VARC",
    score: "",
    totalQuestions: "24",
    attempted: "",
    correct: "",
    percentile: "",
    topperScore: "",
    topperPercentile: "",
    notes: "",
    questionBlocks: [
      { id: blockId(), type: "set", name: "Set 1", startQuestion: 1, endQuestion: 5 },
      { id: blockId(), type: "set", name: "Set 2", startQuestion: 6, endQuestion: 9 },
      { id: blockId(), type: "independent", name: "Independent Questions", startQuestion: 10, endQuestion: 13 },
      { id: blockId(), type: "set", name: "Set 3", startQuestion: 14, endQuestion: 18 },
      { id: blockId(), type: "set", name: "Set 4", startQuestion: 19, endQuestion: 24 },
    ],
  },
  {
    section: "DILR",
    score: "",
    totalQuestions: "22",
    attempted: "",
    correct: "",
    percentile: "",
    topperScore: "",
    topperPercentile: "",
    notes: "",
    questionBlocks: [
      { id: blockId(), type: "set", name: "Set 1", startQuestion: 1, endQuestion: 5 },
      { id: blockId(), type: "set", name: "Set 2", startQuestion: 6, endQuestion: 10 },
      { id: blockId(), type: "set", name: "Set 3", startQuestion: 11, endQuestion: 15 },
      { id: blockId(), type: "set", name: "Set 4", startQuestion: 16, endQuestion: 22 },
    ],
  },
  {
    section: "Quant",
    score: "",
    totalQuestions: "22",
    attempted: "",
    correct: "",
    percentile: "",
    topperScore: "",
    topperPercentile: "",
    notes: "",
    questionBlocks: [
      { id: blockId(), type: "independent", name: "Independent Questions", startQuestion: 1, endQuestion: 22 },
    ],
  },
];

function emptyMockForm() {
  return {
    date: today(),
    source: "",
    sections: DEFAULT_SECTIONS.map((section) => ({
      ...section,
      questionBlocks: section.questionBlocks.map((block) => ({ ...block, id: blockId() })),
    })),
  };
}

const numToFormValue = (value) => (value === null || value === undefined ? "" : String(value));

/** Reverse of submitMock's payload shape, so an existing mock (however it was
    created — manual form, JSON import, or a prior edit) can be loaded back
    into the same form for editing. Falls back to the DEFAULT_SECTIONS
    template for any section the mock doesn't have. */
function mockToForm(mock) {
  return {
    date: mock.date,
    source: mock.source,
    sections: DEFAULT_SECTIONS.map((defaultSection) => {
      const existing = mock[defaultSection.section];
      if (!existing) {
        return { ...defaultSection, questionBlocks: defaultSection.questionBlocks.map((block) => ({ ...block, id: blockId() })) };
      }
      const questionBlocks = existing.questionBlocks?.length ? existing.questionBlocks : defaultSection.questionBlocks;
      return {
        section: defaultSection.section,
        score: numToFormValue(existing.manualTotalMarks),
        totalQuestions: numToFormValue(existing.totalQuestions) || defaultSection.totalQuestions,
        attempted: numToFormValue(existing.attempted),
        correct: numToFormValue(existing.correct),
        percentile: numToFormValue(existing.percentile),
        topperScore: numToFormValue(existing.topperScore),
        topperPercentile: numToFormValue(existing.topperPercentile),
        notes: existing.notes || "",
        questionBlocks: questionBlocks.map((block) => ({ ...block, id: block.id || blockId() })),
      };
    }),
  };
}

function validateMockForm(form) {
  const errors = [];
  if (!form.date) errors.push("Enter the mock date.");
  if (!form.source.trim()) errors.push("Enter the mock or exam name.");
  form.sections.forEach((section) => {
    const score = Number(section.score);
    if (!Number.isFinite(score)) errors.push(`${section.section}: enter the logged score.`);

    const totalQuestions = Number(section.totalQuestions);
    const attempted = section.attempted === "" ? null : Number(section.attempted);
    const correct = section.correct === "" ? null : Number(section.correct);
    if (attempted !== null) {
      if (!Number.isInteger(attempted) || attempted < 0 || attempted > totalQuestions) {
        errors.push(`${section.section}: attempted must be a whole number between 0 and total questions.`);
      } else if (correct !== null && (!Number.isInteger(correct) || correct < 0 || correct > attempted)) {
        errors.push(`${section.section}: correct must be a whole number between 0 and attempted.`);
      }
    } else if (correct !== null) {
      errors.push(`${section.section}: enter attempted before correct.`);
    }

    if (section.percentile !== "" && (!Number.isFinite(Number(section.percentile)) || Number(section.percentile) < 0 || Number(section.percentile) > 100)) {
      errors.push(`${section.section}: percentile must be a number between 0 and 100.`);
    }
    if (section.topperScore !== "" && !Number.isFinite(Number(section.topperScore))) {
      errors.push(`${section.section}: topper score must be a number.`);
    }
    if (section.topperPercentile !== "" && (!Number.isFinite(Number(section.topperPercentile)) || Number(section.topperPercentile) < 0 || Number(section.topperPercentile) > 100)) {
      errors.push(`${section.section}: topper percentile must be a number between 0 and 100.`);
    }

    errors.push(...validateSectionBlockCoverage(section));
  });
  return errors;
}

function structureSummary(section) {
  const sets = section.questionBlocks.filter((block) => block.type === "set").length;
  const independent = section.questionBlocks.filter((block) => block.type === "independent").length;
  const parts = [];
  if (sets) parts.push(`${sets} set${sets === 1 ? "" : "s"}`);
  if (independent) parts.push(`${independent} independent block${independent === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "no blocks yet";
}

function Panel({ title, children, action }) {
  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 style={TYPE.panelTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function MockLogTab({
  mocks,
  settings,
  onLoadSample,
  onOpenAnalysis,
  onCreateMock,
  onEditMock,
  onDeleteMock,
  onImportMocks,
}) {
  const [mockForm, setMockForm] = useState(emptyMockForm);
  const [formErrors, setFormErrors] = useState([]);
  const [showStructure, setShowStructure] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [editingMockId, setEditingMockId] = useState(null);
  const importFileInputRef = useRef(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const formTopRef = useRef(null);

  const startEditMock = (mockId) => {
    const mock = mocks.find((m) => m.id === mockId);
    if (!mock) return;
    const form = mockToForm(mock);
    setMockForm(form);
    setEditingMockId(mockId);
    setFormErrors([]);
    setShowExtras(form.sections.some((section) => section.percentile || section.topperScore || section.topperPercentile || section.notes));
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEditMock = () => {
    setEditingMockId(null);
    setMockForm(emptyMockForm());
    setFormErrors([]);
  };

  const setField = (field) => (ev) => {
    setMockForm((form) => ({ ...form, [field]: ev.target.value }));
  };

  const setSectionField = (sectionIdx, field) => (ev) => {
    const value = ev.target.value;
    setMockForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => (
        idx === sectionIdx ? { ...section, [field]: value } : section
      )),
    }));
  };

  const setBlockField = (sectionIdx, blockIdValue, field) => (ev) => {
    const value = ev.target.value;
    setMockForm((form) => ({
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

  const addBlock = (sectionIdx, type) => {
    setMockForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => {
        if (idx !== sectionIdx) return section;
        const lastEnd = section.questionBlocks.reduce((max, block) => Math.max(max, Number(block.endQuestion || 0)), 0);
        const start = Math.min(lastEnd + 1, Number(section.totalQuestions || 1));
        const newBlockId = blockId();
        const newBlocks = [
          ...section.questionBlocks,
          { id: newBlockId, type, name: type === "set" ? "Set" : "Independent Questions", startQuestion: start, endQuestion: start },
        ];
        return { ...section, questionBlocks: renumberBlockNames(newBlocks, newBlockId) };
      }),
    }));
  };

  const removeBlock = (sectionIdx, blockIdValue) => {
    setMockForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => (
        idx === sectionIdx
          ? { ...section, questionBlocks: renumberBlockNames(section.questionBlocks.filter((block) => block.id !== blockIdValue)) }
          : section
      )),
    }));
  };

  const handleImportFile = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = onImportMocks(reader.result);
        setImportMessage(`Imported ${count} mock${count === 1 ? "" : "s"}`);
        setImportError("");
      } catch (err) {
        setImportError(err.message || "Could not import that mock JSON.");
        setImportMessage("");
      }
    };
    reader.readAsText(file);
  };

  const submitMock = (ev) => {
    ev.preventDefault();
    const errors = validateMockForm(mockForm);
    setFormErrors(errors);
    if (errors.length > 0) {
      setShowStructure(true);
      return;
    }

    const sections = mockForm.sections.map((section) => ({
      section: section.section,
      manualTotalMarks: Number(section.score),
      totalQuestions: Number(section.totalQuestions),
      attempted: section.attempted === "" ? undefined : Number(section.attempted),
      correct: section.correct === "" ? undefined : Number(section.correct),
      percentile: section.percentile === "" ? undefined : Number(section.percentile),
      topperScore: section.topperScore === "" ? undefined : Number(section.topperScore),
      topperPercentile: section.topperPercentile === "" ? undefined : Number(section.topperPercentile),
      notes: section.notes || undefined,
      questionSetCount: section.questionBlocks.filter((block) => block.type === "set").length,
      questionBlocks: section.questionBlocks.map((block) => ({
        ...block,
        startQuestion: Number(block.startQuestion),
        endQuestion: Number(block.endQuestion),
      })),
    }));
    const payload = {
      date: mockForm.date,
      source: mockForm.source.trim(),
      totalMarks: sections.reduce((sum, section) => sum + section.manualTotalMarks, 0),
      sections,
    };
    if (editingMockId) {
      onEditMock(editingMockId, payload);
      setEditingMockId(null);
    } else {
      onCreateMock(payload);
    }
    setMockForm(emptyMockForm());
    setFormErrors([]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={formTopRef} />
      <Panel
        title={editingMockId ? "Edit Mock Result" : "Log Mock Result"}
        action={
          <div className="flex flex-col items-end gap-1">
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
          </div>
        }
      >
        {editingMockId ? (
          <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
            Editing an existing mock — change anything below (including the date) and save. This updates the mock in place instead
            of deleting and re-logging it.
          </p>
        ) : (
        <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Import adds mocks on top of what's already logged — it doesn't replace anything. Accepts one mock object, an array of
          mocks, or {"{"}"mocks": [...]{"}"}, each like{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {'{"date":"2026-07-20","source":"SIMCAT 6","sections":[{"section":"VARC","score":42,"totalQuestions":22,"attempted":20,"correct":15}]}'}
          </code>
          . <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>questionBlocks</code>, <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>percentile</code>,{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>topperScore</code>, <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>topperPercentile</code>,{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>attempted</code>, and{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>correct</code> are optional per section — add attempted/correct to get accuracy and attempt rate right away, without needing a full Analysis first.
          Skipped an optional field or mistyped the date? Edit the mock later from its row menu in the table below.
        </p>
        )}
        {importError && (
          <div className="p-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8 }}>
            {importError}
          </div>
        )}
        {importMessage && !importError && <p className="text-sm" style={{ color: COLORS.good }}>{importMessage}</p>}
        <form onSubmit={submitMock} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Mock date</label>
              <input type="date" value={mockForm.date} onChange={setField("date")} style={inputStyle(false)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Mock / exam name</label>
              <input value={mockForm.source} onChange={setField("source")} placeholder="SIMCAT 6 / AIMCAT 2507" style={inputStyle(false)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 -mb-1">
            <button
              type="button"
              onClick={() => setShowStructure((v) => !v)}
              className="theme-hover self-start inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              style={{ borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
            >
              {showStructure ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {showStructure ? "Hide question structure" : "Customize question structure (sets & ranges)"}
            </button>
            <button
              type="button"
              onClick={() => setShowExtras((v) => !v)}
              className="theme-hover self-start inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              style={{ borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
            >
              {showExtras ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {showExtras ? "Hide percentile, topper stats & notes" : "Add percentile, topper stats & notes (optional)"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {mockForm.sections.map((section, sectionIdx) => (
              <div key={section.section} className="p-4 flex flex-col gap-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <SectionBadge section={section.section} size="sm" />
                    {!showStructure && (
                      <span className="text-xs" style={{ color: COLORS.inkMuted }}>{structureSummary(section)}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                    <div className="flex flex-col gap-1.5">
                      <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Score</label>
                      <input type="number" value={section.score} onChange={setSectionField(sectionIdx, "score")} style={{ ...inputStyle(false), width: 110 }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Total questions</label>
                      <input type="number" min="1" value={section.totalQuestions} onChange={setSectionField(sectionIdx, "totalQuestions")} style={{ ...inputStyle(false), width: 110 }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Attempted <span style={{ opacity: 0.6 }}>(optional)</span></label>
                      <input type="number" min="0" placeholder="—" value={section.attempted} onChange={setSectionField(sectionIdx, "attempted")} style={{ ...inputStyle(false), width: 100 }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Correct <span style={{ opacity: 0.6 }}>(optional)</span></label>
                      <input type="number" min="0" placeholder="—" value={section.correct} onChange={setSectionField(sectionIdx, "correct")} style={{ ...inputStyle(false), width: 100 }} />
                    </div>
                  </div>
                </div>

                {showExtras && (
                <div className="animate-fade-up grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Percentile <span style={{ opacity: 0.6 }}>(optional)</span></label>
                    <input type="number" min="0" max="100" step="0.01" placeholder="—" value={section.percentile} onChange={setSectionField(sectionIdx, "percentile")} style={{ ...inputStyle(false), width: 110 }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Topper score <span style={{ opacity: 0.6 }}>(optional)</span></label>
                    <input type="number" placeholder="—" value={section.topperScore} onChange={setSectionField(sectionIdx, "topperScore")} style={{ ...inputStyle(false), width: 110 }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Topper percentile <span style={{ opacity: 0.6 }}>(optional)</span></label>
                    <input type="number" min="0" max="100" step="0.01" placeholder="—" value={section.topperPercentile} onChange={setSectionField(sectionIdx, "topperPercentile")} style={{ ...inputStyle(false), width: 110 }} />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Notes <span style={{ opacity: 0.6 }}>(optional)</span></label>
                    <input placeholder="e.g. rushed the last set" value={section.notes} onChange={setSectionField(sectionIdx, "notes")} style={inputStyle(false)} />
                  </div>
                </div>
                )}

                {showStructure && (
                <div className="animate-fade-up overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 860 }}>
                    <thead>
                      <tr style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
                        {["Type", "Name", "Start Q", "End Q", ""].map((label) => (
                          <th key={label} className="text-left px-3 py-2.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.questionBlocks.map((block) => (
                        <tr key={block.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                          <td className="px-3 py-2.5">
                            <select value={block.type} onChange={setBlockField(sectionIdx, block.id, "type")} style={{ ...inputStyle(false), minWidth: 150, height: 40, fontSize: 14 }}>
                              <option value="set">Set</option>
                              <option value="independent">Independent</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <input value={block.name} onChange={setBlockField(sectionIdx, block.id, "name")} style={{ ...inputStyle(false), minWidth: 240, height: 40, fontSize: 14 }} />
                          </td>
                          <td className="px-3 py-2.5">
                            <input type="number" min="1" value={block.startQuestion} onChange={setBlockField(sectionIdx, block.id, "startQuestion")} style={{ ...inputStyle(false), width: 110, height: 40, fontSize: 14 }} />
                          </td>
                          <td className="px-3 py-2.5">
                            <input type="number" min="1" value={block.endQuestion} onChange={setBlockField(sectionIdx, block.id, "endQuestion")} style={{ ...inputStyle(false), width: 110, height: 40, fontSize: 14 }} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button type="button" onClick={() => removeBlock(sectionIdx, block.id)} className="theme-hover inline-flex items-center justify-center" style={{ width: 40, height: 40, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.danger }}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}

                {showStructure && (
                <div className="animate-fade-up flex flex-wrap gap-2">
                  <button type="button" onClick={() => addBlock(sectionIdx, "set")} className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink }}>
                    <Plus size={13} /> Add set
                  </button>
                  <button type="button" onClick={() => addBlock(sectionIdx, "independent")} className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink }}>
                    <Plus size={13} /> Add independent
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>

          {formErrors.length > 0 && (
            <div className="p-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8 }}>
              {formErrors.map((error) => <div key={error}>{error}</div>)}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button type="submit" className="self-start inline-flex items-center gap-1.5 px-4 py-2 text-sm hover:opacity-90" style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
              {editingMockId ? <Check size={14} /> : <Plus size={14} />}
              {editingMockId ? "Save changes" : "Log mock"}
            </button>
            {editingMockId && (
              <button
                type="button"
                onClick={cancelEditMock}
                className="theme-hover self-start inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
              >
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </form>
      </Panel>

      {mocks.length === 0 && (
        <div className="flex items-center justify-between p-4 flex-wrap gap-3" style={{ background: COLORS.surface2, border: `1px dashed ${COLORS.border}`, borderRadius: 12 }}>
          <span className="text-sm" style={{ color: COLORS.inkMuted }}>Nothing logged yet — add a mock above, or load sample scores to explore the app quickly.</span>
          <button onClick={onLoadSample} className="theme-hover flex items-center gap-1.5 px-3 py-1.5 text-sm"
            style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            <Sparkles size={14} /> Load sample scores
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 style={TYPE.chartTitle}>Mocks</h3>
        <MockLogTable mocks={mocks} settings={settings} onOpenAnalysis={onOpenAnalysis} onEditMock={startEditMock} onDeleteMock={onDeleteMock} />
      </div>

    </div>
  );
}
