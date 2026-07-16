import { Download, Info, ShieldCheck } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../../constants";

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} style={{ color: COLORS.inkMuted }} />}
        <h3 style={TYPE.chartTitle}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldTable({ rows }) {
  return (
    <div className="text-sm" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 2fr", background: COLORS.surface2 }}>
        {["Part", "Purpose"].map((h) => (
          <div key={h} className="px-3 py-2" style={{ ...TYPE.label, color: COLORS.inkMuted }}>{h}</div>
        ))}
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.part}
          className="grid"
          style={{ gridTemplateColumns: "1fr 2fr", borderTop: `1px solid ${COLORS.border}`, background: idx % 2 ? COLORS.surface2 : COLORS.surface }}
        >
          <div className="px-3 py-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{row.part}</div>
          <div className="px-3 py-2" style={{ color: COLORS.inkMuted }}>{row.purpose}</div>
        </div>
      ))}
    </div>
  );
}

export default function AboutTab() {
  return (
    <div className="flex flex-col gap-4">
      <Panel icon={Info} title="Mock-first structure">
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Each mock is saved as one parent record. It owns the exam name, date, section scores, section question structure,
          and one optional detailed analysis. Mock Log stays focused on the lightweight result, while Mock Analysis extends
          that same mock with question-level review data.
        </p>
        <FieldTable
          rows={[
            { part: "Mock", purpose: "Single source of truth for exam name, date, totals, sections, and optional analysis." },
            { part: "Sections", purpose: "Score, total question count, and set/independent question distribution for each section." },
            { part: "Analysis", purpose: "Question-level result, reason, type, time, average time, and notes attached to the selected mock." },
          ]}
        />
      </Panel>

      <Panel icon={ShieldCheck} title="Local storage">
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Data is stored in this browser's local storage. The app still migrates older saved local data into the current
          mock-first shape on load, but the active logging and analysis workflows are now fully in-app.
        </p>
      </Panel>

      <Panel icon={Download} title="Score math">
        <FieldTable
          rows={[
            { part: "Correct", purpose: "+3 marks" },
            { part: "Wrong MCQ", purpose: "-1 mark" },
            { part: "Wrong TITA", purpose: "0 negative marks" },
            { part: "Skipped", purpose: "0 marks" },
          ]}
        />
      </Panel>
    </div>
  );
}
