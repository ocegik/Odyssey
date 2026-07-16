import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../../constants";
import MockLogTable from "../MockLogTable";
import SectionBadge from "../ui/SectionBadge";
import { inputStyle } from "../ui/FieldLabel";

const today = () => new Date().toISOString().slice(0, 10);
const blockId = () => `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_SECTIONS = [
  {
    section: "VARC",
    score: "",
    totalQuestions: "22",
    questionBlocks: [
      { id: blockId(), type: "set", name: "Set 1", startQuestion: 1, endQuestion: 5 },
      { id: blockId(), type: "set", name: "Set 2", startQuestion: 6, endQuestion: 9 },
      { id: blockId(), type: "independent", name: "Independent Questions", startQuestion: 10, endQuestion: 13 },
      { id: blockId(), type: "set", name: "Set 3", startQuestion: 14, endQuestion: 18 },
      { id: blockId(), type: "set", name: "Set 4", startQuestion: 19, endQuestion: 22 },
    ],
  },
  {
    section: "DILR",
    score: "",
    totalQuestions: "20",
    questionBlocks: [
      { id: blockId(), type: "set", name: "Set 1", startQuestion: 1, endQuestion: 5 },
      { id: blockId(), type: "set", name: "Set 2", startQuestion: 6, endQuestion: 10 },
      { id: blockId(), type: "set", name: "Set 3", startQuestion: 11, endQuestion: 15 },
      { id: blockId(), type: "set", name: "Set 4", startQuestion: 16, endQuestion: 20 },
    ],
  },
  {
    section: "Quant",
    score: "",
    totalQuestions: "22",
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

function validateBlocks(section) {
  const totalQuestions = Number(section.totalQuestions);
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1) return [`${section.section}: enter total questions.`];

  const seen = new Map();
  const errors = [];
  section.questionBlocks.forEach((block) => {
    const start = Number(block.startQuestion);
    const end = Number(block.endQuestion);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > totalQuestions) {
      errors.push(`${section.section}: ${block.name || "block"} has an invalid question range.`);
      return;
    }
    for (let q = start; q <= end; q += 1) {
      seen.set(q, (seen.get(q) || 0) + 1);
    }
  });

  for (let q = 1; q <= totalQuestions; q += 1) {
    if (!seen.has(q)) errors.push(`${section.section}: question ${q} is not covered by any set/independent block.`);
    if (seen.get(q) > 1) errors.push(`${section.section}: question ${q} is covered more than once.`);
  }
  return errors;
}

function validateMockForm(form) {
  const errors = [];
  if (!form.date) errors.push("Enter the mock date.");
  if (!form.source.trim()) errors.push("Enter the mock or exam name.");
  form.sections.forEach((section) => {
    const score = Number(section.score);
    if (!Number.isFinite(score)) errors.push(`${section.section}: enter the logged score.`);
    errors.push(...validateBlocks(section));
  });
  return errors;
}

function Panel({ title, children }) {
  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <h2 style={TYPE.panelTitle}>{title}</h2>
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
  onDeleteMock,
}) {
  const [mockForm, setMockForm] = useState(emptyMockForm);
  const [formErrors, setFormErrors] = useState([]);

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
        return {
          ...section,
          questionBlocks: section.questionBlocks.map((block) => (
            block.id === blockIdValue ? { ...block, [field]: field === "startQuestion" || field === "endQuestion" ? Number(value) : value } : block
          )),
        };
      }),
    }));
  };

  const addBlock = (sectionIdx, type) => {
    setMockForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => {
        if (idx !== sectionIdx) return section;
        const lastEnd = section.questionBlocks.reduce((max, block) => Math.max(max, Number(block.endQuestion || 0)), 0);
        return {
          ...section,
          questionBlocks: [
            ...section.questionBlocks,
            {
              id: blockId(),
              type,
              name: type === "set" ? `Set ${section.questionBlocks.filter((block) => block.type === "set").length + 1}` : "Independent Questions",
              startQuestion: Math.min(lastEnd + 1, Number(section.totalQuestions || 1)),
              endQuestion: Math.min(lastEnd + 1, Number(section.totalQuestions || 1)),
            },
          ],
        };
      }),
    }));
  };

  const removeBlock = (sectionIdx, blockIdValue) => {
    setMockForm((form) => ({
      ...form,
      sections: form.sections.map((section, idx) => (
        idx === sectionIdx
          ? { ...section, questionBlocks: section.questionBlocks.filter((block) => block.id !== blockIdValue) }
          : section
      )),
    }));
  };

  const submitMock = (ev) => {
    ev.preventDefault();
    const errors = validateMockForm(mockForm);
    setFormErrors(errors);
    if (errors.length > 0) return;

    const sections = mockForm.sections.map((section) => ({
      section: section.section,
      manualTotalMarks: Number(section.score),
      totalQuestions: Number(section.totalQuestions),
      questionSetCount: section.questionBlocks.filter((block) => block.type === "set").length,
      questionBlocks: section.questionBlocks.map((block) => ({
        ...block,
        startQuestion: Number(block.startQuestion),
        endQuestion: Number(block.endQuestion),
      })),
    }));
    onCreateMock({
      date: mockForm.date,
      source: mockForm.source.trim(),
      totalMarks: sections.reduce((sum, section) => sum + section.manualTotalMarks, 0),
      sections,
    });
    setMockForm(emptyMockForm());
    setFormErrors([]);
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Log Mock Result">
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

          <div className="flex flex-col gap-3">
            {mockForm.sections.map((section, sectionIdx) => (
              <div key={section.section} className="p-4 flex flex-col gap-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <SectionBadge section={section.section} size="sm" />
                  <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                    <div className="flex flex-col gap-1.5">
                      <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Score</label>
                      <input type="number" value={section.score} onChange={setSectionField(sectionIdx, "score")} style={{ ...inputStyle(false), width: 120 }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={{ ...TYPE.label, color: COLORS.inkMuted }}>Total questions</label>
                      <input type="number" min="1" value={section.totalQuestions} onChange={setSectionField(sectionIdx, "totalQuestions")} style={{ ...inputStyle(false), width: 150 }} />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
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

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => addBlock(sectionIdx, "set")} className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink }}>
                    <Plus size={13} /> Add set
                  </button>
                  <button type="button" onClick={() => addBlock(sectionIdx, "independent")} className="theme-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink }}>
                    <Plus size={13} /> Add independent
                  </button>
                </div>
              </div>
            ))}
          </div>

          {formErrors.length > 0 && (
            <div className="p-3 text-sm" style={{ background: COLORS.varcSoft, color: COLORS.danger, borderRadius: 8 }}>
              {formErrors.map((error) => <div key={error}>{error}</div>)}
            </div>
          )}

          <button type="submit" className="self-start inline-flex items-center gap-1.5 px-4 py-2 text-sm hover:opacity-90" style={{ background: COLORS.ink, color: COLORS.bg, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
            <Plus size={14} /> Log mock
          </button>
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
        <MockLogTable mocks={mocks} settings={settings} onOpenAnalysis={onOpenAnalysis} onDeleteMock={onDeleteMock} />
      </div>

    </div>
  );
}
