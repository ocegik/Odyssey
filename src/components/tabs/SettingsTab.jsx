import { useRef, useState } from "react";
import { CheckCircle2, Download, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { COLORS, SECTIONS, SECTION_META, TYPE, SHADOW } from "../../constants";
import { fmtNum } from "../../lib/format";
import { mockTotalMarks, computeAdaptiveTarget } from "../../lib/compute";
import { FieldLabel, inputStyle } from "../ui/FieldLabel";
import EmptyState from "../ui/EmptyState";

const EMPTY_SCHEDULE_FORM = { date: "", examName: "" };

function Panel({ title, children, action }) {
  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center justify-between gap-3">
        <h2 style={TYPE.panelTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function SettingsTab({
  settings,
  mocks,
  onUpdateProfile,
  onUpdateSectionTarget,
  onAddScheduleEntry,
  onUpdateScheduleEntry,
  onDeleteScheduleEntry,
  onImportScheduleEntries,
  onExportData,
  onImportData,
}) {
  const latestMock = mocks && mocks.length > 0 ? mocks[mocks.length - 1] : null;
  const lastMarks = latestMock ? mockTotalMarks(latestMock) : null;
  const nextTargetMarks = computeAdaptiveTarget(lastMarks, settings.overallTargetMarks);
  const fileInputRef = useRef(null);
  const dataFileInputRef = useRef(null);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [dataError, setDataError] = useState("");

  const setProfileField = (field) => (ev) => {
    onUpdateProfile({ [field]: ev.target.value });
  };

  const setScheduleField = (field) => (ev) => {
    setScheduleForm((form) => ({ ...form, [field]: ev.target.value }));
  };

  const clearScheduleForm = () => {
    setScheduleForm(EMPTY_SCHEDULE_FORM);
    setEditingId(null);
    setError("");
  };

  const submitSchedule = (ev) => {
    ev.preventDefault();
    try {
      if (editingId) {
        onUpdateScheduleEntry(editingId, scheduleForm);
        setMessage("Schedule entry updated");
      } else {
        onAddScheduleEntry(scheduleForm);
        setMessage("Schedule entry added");
      }
      clearScheduleForm();
    } catch (err) {
      setError(err.message || "Could not save that schedule entry.");
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setScheduleForm({
      date: entry.date,
      examName: entry.examName,
    });
    setError("");
  };

  const handleImportFile = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = onImportScheduleEntries(reader.result);
        setMessage(`Imported ${count} schedule ${count === 1 ? "entry" : "entries"}`);
        setError("");
      } catch (err) {
        setError(err.message || "Could not import that schedule JSON.");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  };

  const handleImportDataFile = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    if (!window.confirm("Import will replace all mocks and settings currently on this device with the backup file. This can't be undone. Continue?")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = onImportData(reader.result);
        setDataMessage(`Imported ${count} mock${count === 1 ? "" : "s"} and settings`);
        setDataError("");
      } catch (err) {
        setDataError(err.message || "Could not import that backup JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Data Backup"
        action={
          <div className="flex gap-2">
            <input ref={dataFileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportDataFile} />
            <button
              type="button"
              onClick={onExportData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-black/[0.04]"
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
            >
              <Download size={14} />
              Export data
            </button>
            <button
              type="button"
              onClick={() => dataFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-black/[0.04]"
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
            >
              <Upload size={14} />
              Import data
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Export bundles every logged mock, analysis, and setting into one JSON file — useful as a manual backup
          alongside cloud sync. Importing a backup <strong style={{ color: COLORS.ink }}>replaces</strong> all mocks
          and settings currently on this device, it doesn't merge with them.
        </p>
        {dataError && <p className="text-sm" style={{ color: COLORS.danger }}>{dataError}</p>}
        {dataMessage && !dataError && <p className="text-sm" style={{ color: COLORS.good }}>{dataMessage}</p>}
      </Panel>

      <Panel title="Student Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="studentName">Student name</FieldLabel>
            <input id="studentName" value={settings.studentName} onChange={setProfileField("studentName")} style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="catTargetDate">CAT exam date</FieldLabel>
            <input id="catTargetDate" type="date" value={settings.catTargetDate} onChange={setProfileField("catTargetDate")} style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="overallTargetMarks" optional>Overall target marks</FieldLabel>
            <input id="overallTargetMarks" type="number" min="0" value={settings.overallTargetMarks ?? ""} onChange={setProfileField("overallTargetMarks")} style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="overallTargetPercentile" optional>Overall target percentile</FieldLabel>
            <input id="overallTargetPercentile" type="number" min="0" max="100" step="0.01" value={settings.overallTargetPercentile ?? ""} onChange={setProfileField("overallTargetPercentile")} style={inputStyle(false)} />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <p className="text-xs leading-relaxed pt-3" style={{ color: COLORS.inkMuted }}>
            Optional per-section target marks — when set, they show as dashed reference lines on the section-wise trend chart in Trends.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SECTIONS.map((section) => (
              <div key={section} className="flex flex-col gap-1.5">
                <FieldLabel htmlFor={`sectionTarget-${section}`} optional>
                  <span style={{ color: SECTION_META[section].color }}>{section}</span> target marks
                </FieldLabel>
                <input
                  id={`sectionTarget-${section}`}
                  type="number"
                  min="0"
                  value={settings.sectionTargetMarks?.[section] ?? ""}
                  onChange={(ev) => onUpdateSectionTarget(section, ev.target.value)}
                  style={inputStyle(false)}
                />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Mock Schedule"
        action={
          <>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-black/[0.04]"
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
            >
              <Upload size={14} />
              Import schedule
            </button>
          </>
        }
      >
        <form onSubmit={submitSchedule} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="scheduleDate">Date</FieldLabel>
            <input id="scheduleDate" type="date" value={scheduleForm.date} onChange={setScheduleField("date")} style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="examName">Exam name</FieldLabel>
            <input id="examName" value={scheduleForm.examName} onChange={setScheduleField("examName")} placeholder="SIMCAT 6 / AIMCAT 2507" style={inputStyle(false)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm hover:opacity-90"
              style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
              {editingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
              {editingId ? "Save" : "Add"}
            </button>
            {editingId && (
              <button type="button" onClick={clearScheduleForm} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm hover:bg-black/[0.04]"
                style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
                <X size={14} />
                Cancel
              </button>
            )}
          </div>
        </form>

        <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
          JSON import accepts either an array like{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>[{"{\"date\":\"2026-07-20\",\"examName\":\"SIMCAT 6\"}"}]</code>{" "}
          or an object with <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>mockSchedule</code>.
        </p>

        {error && <p className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
        {message && !error && <p className="text-sm" style={{ color: COLORS.good }}>{message}</p>}

        {settings.mockSchedule.length === 0 ? (
          <EmptyState icon={Upload} title="No schedule yet" body="Add entries manually or import a JSON schedule." />
        ) : (
          <>
            <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
              Next target is auto-generated from your most recent logged score — a small step up, capped at your overall target marks — not something you set per entry.
            </p>
            <div className="overflow-x-auto" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
                    {["Date", "Exam", "Next target (auto)", "Actions"].map((label, idx) => (
                      <th key={label} className={`px-3 py-2 text-left ${idx === 3 ? "text-right" : ""}`} style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settings.mockSchedule.map((entry, idx) => (
                    <tr key={entry.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: idx % 2 ? COLORS.surface : COLORS.surface2 }}>
                      <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.date}</td>
                      <td className="px-3 py-2">{entry.examName}</td>
                      <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(nextTargetMarks, 0)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => startEdit(entry)} title="Edit" className="p-1.5 rounded-md hover:bg-black/[0.05]" style={{ color: COLORS.inkMuted }}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => onDeleteScheduleEntry(entry.id)} title="Delete" className="p-1.5 rounded-md hover:bg-black/[0.05]" style={{ color: COLORS.danger }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
