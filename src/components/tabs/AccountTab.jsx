import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { COLORS, SECTIONS, SECTION_META, TYPE, SHADOW } from "../../constants";
import { CURRENT_STATUS_OPTIONS, GENDER_OPTIONS, LAYOUT_WIDTH_OPTIONS, TEST_SERIES_OPTIONS } from "../../hooks/useSettings";
import { catExamDateForYear, fmtDateLong } from "../../lib/dateMath";
import { fmtDate, fmtNum } from "../../lib/format";
import { mockTotalMarks, computeAdaptiveTarget } from "../../lib/compute";
import { FieldLabel, inputStyle, selectStyle } from "../ui/FieldLabel";
import EmptyState from "../ui/EmptyState";
import AccountTypeSelector from "../AccountTypeSelector";
import HelpTip from "../ui/HelpTip";

const EMPTY_SCHEDULE_FORM = { date: "", examName: "", dateType: "fixed", windowStart: "", windowEnd: "" };

const DATE_TYPE_OPTIONS = [
  { key: "fixed", label: "Fixed date" },
  { key: "range", label: "Date range" },
  { key: "flexible", label: "Flexible" },
];

function scheduleWindowLabel(entry, fmtDate) {
  if (entry.dateType === "range") return `${fmtDate(entry.windowStart)} – ${fmtDate(entry.windowEnd)}`;
  if (entry.dateType === "flexible") return `Anytime from ${fmtDate(entry.windowStart)}`;
  return "Fixed";
}

function Panel({ title, help, children, action }) {
  return (
    <div className="p-5 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 style={TYPE.panelTitle}>{title}</h2>
          {help && <HelpTip label={`About ${title}`}>{help}</HelpTip>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function AccountTab({
  settings,
  mocks,
  userEmail,
  accountType,
  onUpdateAccountType,
  onUpdateProfile,
  onUpdateSectionTarget,
  onAddScheduleEntry,
  onUpdateScheduleEntry,
  onDeleteScheduleEntry,
  onImportScheduleEntries,
  onExportData,
  onImportData,
  onDeleteAccount,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const targetYears = Array.from({ length: 11 }, (_, offset) => new Date().getFullYear() + offset - 1);
  const catExamDate = catExamDateForYear(settings.catTargetYear);

  const setProfileField = (field) => (ev) => {
    onUpdateProfile({ [field]: ev.target.value });
  };

  const setScheduleField = (field) => (ev) => {
    setScheduleForm((form) => ({ ...form, [field]: ev.target.value }));
  };

  const toggleTestSeries = (series) => {
    const selected = settings.testSeries || [];
    onUpdateProfile({
      testSeries: selected.includes(series)
        ? selected.filter((item) => item !== series)
        : [...selected, series],
    });
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
        setMessage("Schedule entry updated.");
      } else {
        onAddScheduleEntry(scheduleForm);
        setMessage("Schedule entry added.");
      }
      clearScheduleForm();
    } catch (err) {
      setError(err.message || "The schedule entry could not be saved. Check the details and try again.");
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setScheduleForm({
      date: entry.date,
      examName: entry.examName,
      dateType: entry.dateType,
      windowStart: entry.windowStart,
      windowEnd: entry.windowEnd,
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
        setMessage(`${count} schedule ${count === 1 ? "entry was" : "entries were"} imported.`);
        setError("");
      } catch (err) {
        setError(err.message || "The schedule JSON could not be imported. Check the file format and try again.");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  };

  const handleImportDataFile = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    if (!window.confirm("Importing this backup replaces all current mocks and preferences on this device. This action cannot be undone. Continue?")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = onImportData(reader.result);
        setDataMessage(`${count} mock${count === 1 ? " was" : "s were"} imported with the saved preferences.`);
        setDataError("");
      } catch (err) {
        setDataError(err.message || "The backup could not be imported. Check the file format and try again.");
      }
    };
    reader.readAsText(file);
  };

  const beginAccountDeletion = () => {
    // Keep the download inside this direct user interaction so browsers do
    // not suppress it as a popup. Deletion still needs a second confirmation.
    onExportData();
    setDeleteDialogOpen(true);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDeleteAccount();
    } catch (err) {
      setDeleteError(err.message || "The account could not be deleted. Try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3" aria-labelledby="account-profile-heading">
        <div>
          <h1 id="account-profile-heading" style={TYPE.pageTitle}>Account</h1>
        </div>
        <Panel title="Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="studentName">Student name</FieldLabel>
              <input id="studentName" value={settings.studentName} onChange={setProfileField("studentName")} maxLength={80} style={inputStyle(false)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="accountEmail">Account email</FieldLabel>
              <input id="accountEmail" value={userEmail || ""} readOnly style={inputStyle(false)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="gender" optional>Gender</FieldLabel>
              <select id="gender" value={settings.gender} onChange={setProfileField("gender")} style={selectStyle(false)}>
                {GENDER_OPTIONS.map((option) => <option key={option.value || "empty"} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="currentStatus">Current status</FieldLabel>
              <select id="currentStatus" value={settings.currentStatus} onChange={setProfileField("currentStatus")} style={selectStyle(false)}>
                <option value="">Select current status</option>
                {CURRENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
        </Panel>
        <Panel title="Account type">
          <AccountTypeSelector value={accountType} onChange={onUpdateAccountType} compact />
        </Panel>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="account-preferences-heading">
        <div>
          <h2 id="account-preferences-heading" style={TYPE.panelTitle}>Preferences</h2>
        </div>
      <Panel
        title="Backup"
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
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>Importing a backup replaces the current mocks and preferences on this device.</p>
        {dataError && <p className="text-sm" style={{ color: COLORS.danger }}>{dataError}</p>}
        {dataMessage && !dataError && <p className="text-sm" style={{ color: COLORS.good }}>{dataMessage}</p>}
      </Panel>

      <Panel title="Account deletion">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm" style={{ color: COLORS.ink, fontWeight: 650 }}>Delete account</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
              Download a backup first, then permanently remove your account and its study data.
            </p>
          </div>
          <button
            type="button"
            onClick={beginAccountDeletion}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-2 text-sm hover:opacity-90"
            style={{ background: COLORS.danger, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
          >
            <Trash2 size={14} /> Delete account
          </button>
        </div>
      </Panel>

      <Panel title="Layout">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="layoutWidth">Page width</FieldLabel>
          <input
            id="layoutWidth"
            type="range"
            min="0"
            max={LAYOUT_WIDTH_OPTIONS.length - 1}
            step="1"
            value={Math.max(0, LAYOUT_WIDTH_OPTIONS.findIndex((opt) => opt.key === settings.layoutWidth))}
            onChange={(ev) => onUpdateProfile({ layoutWidth: LAYOUT_WIDTH_OPTIONS[Number(ev.target.value)].key })}
            style={{ accentColor: COLORS.primary, width: "100%", maxWidth: 320 }}
          />
          <div className="flex gap-1" style={{ maxWidth: 320 }}>
            {LAYOUT_WIDTH_OPTIONS.map((opt) => (
              <span
                key={opt.key}
                className="text-xs flex-1"
                style={{
                  color: opt.key === settings.layoutWidth ? COLORS.ink : COLORS.inkMuted,
                  fontWeight: opt.key === settings.layoutWidth ? 700 : 400,
                  textAlign: opt.key === LAYOUT_WIDTH_OPTIONS[0].key ? "left" : opt.key === LAYOUT_WIDTH_OPTIONS[LAYOUT_WIDTH_OPTIONS.length - 1].key ? "right" : "center",
                }}
              >
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Targets" help="Targets power the dashboard countdown, target lines in Trends, and the section gap view. They are planning benchmarks, not predicted CAT results.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="catTargetYear">CAT target year</FieldLabel>
            <select id="catTargetYear" value={settings.catTargetYear} onChange={setProfileField("catTargetYear")} style={selectStyle(false)}>
              {targetYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="catExamDate" hint="This is the expected CAT date for the selected year and is used for the countdown. It cannot be edited directly.">CAT exam date</FieldLabel>
            <input id="catExamDate" value={fmtDateLong(catExamDate)} readOnly style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="preparationStartDate">Preparation start date</FieldLabel>
            <input id="preparationStartDate" type="date" value={settings.preparationStartDate} onChange={setProfileField("preparationStartDate")} style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="overallTargetMarks" optional hint="Your preferred overall score. It is used to set a next-mock target and an optional reference line in Trends.">Overall target marks</FieldLabel>
            <input id="overallTargetMarks" type="number" min="0" value={settings.overallTargetMarks ?? ""} onChange={setProfileField("overallTargetMarks")} style={inputStyle(false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="overallTargetPercentile" optional hint="Your aspirational percentile. It is shown in the CAT countdown and as a reference line on the percentile trend.">Overall target percentile</FieldLabel>
            <input id="overallTargetPercentile" type="number" min="0" max="100" step="0.01" value={settings.overallTargetPercentile ?? ""} onChange={setProfileField("overallTargetPercentile")} style={inputStyle(false)} />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
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

      <Panel title="Test series">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_SERIES_OPTIONS.map((series) => {
            const checked = (settings.testSeries || []).includes(series);
            return (
              <label key={series} className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: checked ? COLORS.primary : COLORS.border, background: checked ? COLORS.primary + "12" : COLORS.surface, color: COLORS.ink }}>
                <input type="checkbox" checked={checked} onChange={() => toggleTestSeries(series)} style={{ accentColor: COLORS.primary }} />
                {series}
              </label>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Mock Schedule"
        help="Scheduled mocks appear on the Overview as your next mock. A range or flexible window lets you record test-series availability while still setting the day you plan to attempt it."
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
        <form onSubmit={submitSchedule} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="scheduleType">Type</FieldLabel>
              <select
                id="scheduleType"
                value={scheduleForm.dateType}
                onChange={(ev) => setScheduleForm((form) => ({ ...form, dateType: ev.target.value }))}
                style={selectStyle(false)}
              >
                {DATE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="examName">Exam name</FieldLabel>
              <input id="examName" value={scheduleForm.examName} onChange={setScheduleField("examName")} placeholder="AIMCAT2716 / CDC PRO 9" style={inputStyle(false)} />
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scheduleForm.dateType === "range" && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="scheduleWindowStart">Window start</FieldLabel>
                <input id="scheduleWindowStart" type="date" value={scheduleForm.windowStart} onChange={setScheduleField("windowStart")} style={inputStyle(false)} />
              </div>
            )}
            {scheduleForm.dateType === "flexible" && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="scheduleWindowStart">Open from</FieldLabel>
                <input id="scheduleWindowStart" type="date" value={scheduleForm.windowStart} onChange={setScheduleField("windowStart")} style={inputStyle(false)} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="scheduleDate">{scheduleForm.dateType === "fixed" ? "Date" : "Your attempt day"}</FieldLabel>
              <input id="scheduleDate" type="date" value={scheduleForm.date} onChange={setScheduleField("date")} style={inputStyle(false)} />
            </div>
            {scheduleForm.dateType === "range" && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="scheduleWindowEnd">Window end</FieldLabel>
                <input id="scheduleWindowEnd" type="date" value={scheduleForm.windowEnd} onChange={setScheduleField("windowEnd")} style={inputStyle(false)} />
              </div>
            )}
          </div>
        </form>

        {error && <p className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
        {message && !error && <p className="text-sm" style={{ color: COLORS.good }}>{message}</p>}

        {settings.mockSchedule.length === 0 ? (
          <EmptyState icon={Upload} title="No scheduled mocks" body="Add a scheduled mock or import a schedule file." />
        ) : (
          <>
            <div className="table-scroll" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
                    {["Date", "Window", "Exam", "Next target", "Actions"].map((label, idx) => (
                      <th key={label} className={`px-3 py-2 text-left ${idx === 4 ? "text-right" : ""}`} style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settings.mockSchedule.map((entry, idx) => (
                    <tr key={entry.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: idx % 2 ? COLORS.surface : COLORS.surface2 }}>
                      <td className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.date}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{scheduleWindowLabel(entry, fmtDate)}</td>
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
      </section>

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md p-5"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2" style={{ background: COLORS.dangerSoft, color: COLORS.danger }}><AlertTriangle size={19} /></div>
              <div className="flex-1">
                <h2 id="delete-account-title" style={TYPE.panelTitle}>Delete your account?</h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
                  Your data backup has been downloaded. This will permanently delete your account, mocks, analyses, preferences, and syllabus progress. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <FieldLabel htmlFor="deleteAccountConfirmation">Type DELETE to confirm</FieldLabel>
              <input
                id="deleteAccountConfirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                autoFocus
                disabled={deleting}
                style={inputStyle(false)}
              />
            </div>
            {deleteError && <p className="mt-3 text-sm" role="alert" style={{ color: COLORS.danger }}>{deleteError}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onExportData} disabled={deleting} className="px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
                Download again
              </button>
              <button type="button" onClick={closeDeleteDialog} disabled={deleting} className="px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
                Cancel
              </button>
              <button type="button" onClick={handleDeleteAccount} disabled={deleteConfirmation !== "DELETE" || deleting} className="px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" style={{ background: COLORS.danger, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}>
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
