import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Download, Info, ShieldCheck, Sparkles, Bot } from "lucide-react";
import { COLORS, SECTIONS, TYPE, SHADOW } from "../../constants";
import { OUTCOME_REASONS, TOPIC_OPTIONS } from "../../lib/analysisModel";

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

function reasonList(section) {
  return Object.entries(OUTCOME_REASONS[section])
    .map(([result, reasons]) => `      ${result}: ${reasons.map((r) => `"${r}"`).join(", ")}`)
    .join("\n");
}

function topicList(section) {
  const topics = TOPIC_OPTIONS[section] || [];
  return topics.length ? topics.map((t) => `"${t}"`).join(", ") : "(none defined for this section)";
}

/**
 * Assembled from the same OUTCOME_REASONS/TOPIC_OPTIONS/SECTIONS the app
 * validates imports against, so this text can't silently drift out of sync
 * with what Import JSON actually accepts.
 */
function buildAiImportGuide() {
  return `You are helping me get my CAT mock test results into "Odyssey", a personal CAT-prep tracking app for VARC, DILR, and Quant sectional performance. I'll give you a screenshot, PDF, or scraped HTML of my mock result / solution page from a coaching site (TIME, CL, IMS, PW, Bulls Eye, etc.). Read it and output ONE JSON object (or array) in one of the two exact schemas below — raw JSON only, no markdown fences, no commentary.

Sections are always exactly: ${SECTIONS.join(", ")} (case-sensitive; "QA" is also accepted as an alias for "Quant" but prefer "Quant").

=======================================================================
SCHEMA A — Mock Log import (fast, score-only; use this if I only have the scorecard/summary, not a question-by-question solution)
=======================================================================
Where it's imported: Mock Log tab -> "Import JSON". Additive — never replaces existing mocks.
Accepts: one mock object, an array of mock objects, or { "mocks": [...] }.

Mock object fields:
  date            string, required   e.g. "2026-07-20"
  source          string, required   exam/mock name, e.g. "SIMCAT 6" or "AIMCAT 2507"
  sections        array, required    one entry per section that has a score
  analysis        object, optional   a full Schema B object, if you already have question-level detail too

Each entry in "sections":
  section         string, required   one of: ${SECTIONS.join(", ")}
  score           number, required   marks scored in that section (alias: "manualTotalMarks")
  totalQuestions  integer, required  >= 1
  attempted       integer, optional  0..totalQuestions — include if known, unlocks accuracy immediately
  correct         integer, optional  0..attempted — requires "attempted" to also be set
  percentile      number, optional
  topperScore     number, optional
  notes           string, optional
  questionBlocks  array, optional    custom set/independent breakdown (see "blocks" in Schema B for shape:
                                     { "type": "set"|"independent", "name": "Set 1", "startQuestion": 1, "endQuestion": 5 });
                                     every question 1..totalQuestions must be covered exactly once if you provide this.
                                     Omit it entirely and the app auto-creates one independent block spanning all questions.

Example:
{
  "date": "2026-07-20",
  "source": "SIMCAT 6",
  "sections": [
    { "section": "VARC", "score": 42, "totalQuestions": 22, "attempted": 20, "correct": 15, "percentile": 92.4 },
    { "section": "DILR", "score": 30, "totalQuestions": 20, "attempted": 16, "correct": 11 },
    { "section": "Quant", "score": 51, "totalQuestions": 22, "attempted": 19, "correct": 18 }
  ]
}

=======================================================================
SCHEMA B — Mock Analysis import (detailed, per-question; use this if I have a full solution/review page showing each question's outcome)
=======================================================================
Where it's imported: Mock Analysis tab -> select the matching mock (it must already be logged via Schema A first) -> "Import JSON" or "Paste JSON".
IMPORTANT constraint: for each section, the number of questions you output must exactly equal that section's logged "totalQuestions", and the sum of question scores (see scoring rule below) must exactly equal that section's logged score — the app checks both and blocks the save with an error if they don't reconcile. If you don't have enough detail to make every question's outcome add up exactly, tell me instead of guessing silently.

Top-level object fields:
  mockName            string, optional, cosmetic label
  date                string, optional, cosmetic
  overallReflection    string, optional, free text
  overallPercentile   number, optional
  overallTopperScore  number, optional
  sections            object, required — keyed by section name (${SECTIONS.join(", ")})

Each section object:
  percentile   number, optional
  topperScore  number, optional
  notes        string, optional
  blocks       array, required — a "set" block is a shared passage/DI set several questions belong to; an "independent" block is one or more standalone questions

Each block:
  type       "set" | "independent", required
  name       string, e.g. "Set 1" or "Independent Questions"
  topic      string, optional — ONLY meaningful when type is "set"; must be one of: ${SECTIONS.map((s) => `${s}: [${topicList(s)}]`).join("; ")}
  questions  array, required

Each question:
  questionNumber  integer, required — the question's position within its section (1-based)
  result          "Correct" | "Wrong" | "Skipped", required
  outcomeReason   string, required — MUST be exactly one of the allowed reasons for that section+result pair (case-sensitive; an unrecognized value silently falls back to the first allowed reason, which loses information, so pick precisely):
${SECTIONS.map((s) => `    ${s}:\n${reasonList(s)}`).join("\n")}
  questionType    "MCQ" | "TITA", required
  topic           string, optional — for INDEPENDENT questions only (set questions inherit their block's topic); one of the topic lists above for that section
  timeTaken       number (seconds), optional — leave out entirely if you don't know it, do not guess
  averageTime     number (seconds), optional — the benchmark/expected time for that question type, also fine to omit
  notes           string, optional

Scoring rule (used both to compute totals and to validate your output against the logged mock score):
  Correct    -> +3
  Wrong MCQ  -> -1
  Wrong TITA -> 0
  Skipped    -> 0

Example (2-question independent block + a 2-question set, VARC):
{
  "sections": {
    "VARC": {
      "blocks": [
        {
          "type": "set",
          "name": "Set 1",
          "topic": "Reading Comprehension",
          "questions": [
            { "questionNumber": 1, "result": "Correct", "outcomeReason": "Strong Passage Understanding", "questionType": "MCQ" },
            { "questionNumber": 2, "result": "Wrong", "outcomeReason": "Trap Option", "questionType": "MCQ", "timeTaken": 95, "averageTime": 70 }
          ]
        },
        {
          "type": "independent",
          "name": "Independent Questions",
          "questions": [
            { "questionNumber": 3, "result": "Skipped", "outcomeReason": "Ran Out of Time", "questionType": "MCQ", "topic": "Verbal Ability" },
            { "questionNumber": 4, "result": "Correct", "outcomeReason": "Logical Elimination", "questionType": "TITA", "topic": "Verbal Ability" }
          ]
        }
      ]
    }
  }
}

=======================================================================
WORKFLOW
=======================================================================
1. If I only have a scorecard: produce Schema A, I import it in Mock Log.
2. If I have the full per-question solution page: first make sure the mock is logged (Schema A), then produce Schema B for that same mock and I'll import it in Mock Analysis, matched against the mock I select there.
3. If a screenshot is ambiguous or missing a required field (date, source, totalQuestions, section score, or a question's result), ask me rather than inventing a value.`;
}

function CollapsibleAiGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const guide = buildAiImportGuide();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guide);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: COLORS.inkMuted }} />
          <h3 style={TYPE.chartTitle}>AI-assisted data entry (advanced)</h3>
        </div>
        {open ? <ChevronDown size={16} style={{ color: COLORS.inkMuted }} /> : <ChevronRight size={16} style={{ color: COLORS.inkMuted }} />}
      </button>
      <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
        Manually typing in every question gets old fast. This is a ready-made prompt describing exactly what JSON this
        app's Import JSON actions accept — paste it into an AI along with a screenshot or scraped HTML of your mock
        result/solution page from your coaching site, and it can produce a file you import directly instead of
        clicking through every field by hand.
      </p>
      {open && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface2, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 650 }}
          >
            {copied ? <Check size={14} style={{ color: COLORS.good }} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy full prompt"}
          </button>
          <pre
            className="text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto p-3"
            style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", maxHeight: 480, overflowY: "auto" }}
          >
            {guide}
          </pre>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
            Tip: for Schema B, "Download template" on the Mock Analysis tab generates a live example already matching
            your selected mock's exact section/question structure — handing that to an AI alongside this prompt gives
            it the precise shape to fill in.
          </p>
        </div>
      )}
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

      <CollapsibleAiGuide />
    </div>
  );
}
