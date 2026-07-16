import { Download, Info, ShieldCheck, Sparkles } from "lucide-react";
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
      <Panel icon={Sparkles} title="What's new">
        <ul className="text-sm leading-relaxed flex flex-col gap-1.5 list-disc pl-4" style={{ color: COLORS.inkMuted }}>
          <li>Named the project <strong style={{ color: COLORS.ink }}>Odyssey</strong>.</li>
          <li>Data now syncs to a Supabase-backed cloud store in the background, so it's no longer at risk of being lost to a cleared browser cache or a switch of device/browser.</li>
          <li>Mocks can now be deleted directly from Mock Log — useful for clearing out sample/test entries.</li>
        </ul>
      </Panel>

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

      <Panel icon={ShieldCheck} title="Cloud sync">
        <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
          Every mock, analysis, and profile setting syncs to a Supabase-backed cloud store, not just this browser's
          local storage. Local storage still keeps a fast on-device cache so the app loads instantly, but Supabase is
          now the durable copy — your data survives a cleared cache, private browsing, or opening the app on a
          different device. The app still migrates older saved local data into the current mock-first shape on load.
          Export your data periodically as a backup.
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
