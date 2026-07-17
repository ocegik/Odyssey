# Odyssey
# CAT Mock Score Tracker & Visualizer — Project Scope & Requirements

**Purpose:** Track sectional CAT mock performance (VARC / DILR / Quant) across a 4-month prep window to identify which subject is lagging, and whether the gap is an accuracy problem or an attempt-rate problem, and whether it's specifically MCQ or TITA.

**Owner's context:** Full-time CAT prep, ~4 months to exam. Strength order: VARC > DILR > Quant. Quant is weakest and being rebuilt from fundamentals.

---

## 1. Data Model

### 1.1 Required Fields (must be filled for every entry; form validates these)

| Field | Type | Notes |
|---|---|---|
| Date | date | Date of the mock |
| Source | text | e.g. "TIME", "IMS", "Actual CAT Mock #3" |
| Section | enum | VARC / DILR / Quant |
| Attempted MCQ | number | Count of MCQs attempted |
| Attempted TITA | number | Count of TITA attempted |
| Right MCQ | number | Correct MCQs |
| Right TITA | number | Correct TITA |
| Wrong MCQ | number | Incorrect MCQs (stored directly, not derived, to avoid arithmetic entry errors) |
| Wrong TITA | number | Incorrect TITA (stored directly) |
| Total Questions in Section | number | Section question count for that mock (varies by source — e.g. 22, 24, 25) |

### 1.2 Optional Fields (skippable — 2-3 extra clicks if filled; app must not break or force input if left blank)

| Field | Type | Notes |
|---|---|---|
| Percentile | number \| null | Percentile in that mock's student pool |
| Topper Score | number \| null | Highest score in that mock — gives a rough "how hard was this paper" signal |

### 1.3 Detailed Analysis (optional, separate workflow)

- Score entry stays lightweight: users can log section scores without entering any question-level detail.
- Every parent mock can optionally have one detailed analysis attached later.
- Detailed analysis stores mock reflection, structure text, section blocks, question outcomes, reason tags, question type, time taken, benchmark time, review/completion flags, confidence, decision quality, and notes.
- Analysis data is stored under the same parent mock so future insight modules can use it for recurring mistakes, timing patterns, confidence vs. correctness, decision quality, section trends, and long-term comparisons.

---

## 2. Derived / Computed Stats (never stored — always calculated live from raw data)

- **Total Marks (auto-calculated, not entered)** = (Right MCQ × 3) + (Right TITA × 3) + (Wrong MCQ × −1) + (Wrong TITA × 0) + (Unattempted × 0), where Unattempted = Total Questions in Section − Attempted MCQ − Attempted TITA (also derived, not a separate stored field)
- Overall Accuracy = (Right MCQ + Right TITA) / (Attempted MCQ + Attempted TITA)
- MCQ Accuracy = Right MCQ / Attempted MCQ
- TITA Accuracy = Right TITA / Attempted TITA
- Attempt Rate (per section) = (Attempted MCQ + Attempted TITA) / Total Questions in Section — now directly computable since Total Questions in Section is a required field
- Marks per Attempt (efficiency indicator)
- Negative Marks Lost estimate = Wrong MCQ × (CAT negative marking value)
- Rolling 5-mock average per section (smooths one-off bad days)
- Weakest Section Flag — lowest rolling accuracy × attempt-rate combination
- Percentile trend (only for entries where Percentile is filled)
- Exam hardness indicator (only for entries where Topper Score is filled) — your score relative to topper, to contextualize whether a low mock score reflects a hard paper

**Rule:** Any chart/stat depending on an optional field simply skips data points where that field is missing — it never blocks rendering of the rest of the dashboard.

---

## 3. Persistence Model (no backend/database)

- The app is a **static site** — no server, no login, no database
- Data lives in-browser (React state) while the app is open
- **Export**: after adding/editing entries, export a `scores.json` file
- **Import**: on next use, import that same `scores.json` back in — this file is the single source of truth
- Recommended workflow: keep `scores.json` inside the GitHub repo and commit it after each mock — this doubles as free version history/backup
- `scores.json` stores explicit parent mock records; each mock owns its VARC, DILR, and Quant section records instead of inferring the relationship from shared date/source values
- Detailed analysis is optional and stored under the parent mock's `analysis` field when attached
- Old entries without the optional fields (Percentile, Topper Score) must remain valid on import — schema is additive, never breaking

**Update (post-launch):** the app now also syncs to a Supabase table (`app_storage`) in the background, so data survives browser storage being cleared and isn't limited to one device. localStorage remains as a fast local cache; export/import still work the same way as a manual backup path. See `supabase/schema.sql` and `src/lib/cloudStore.js`.

**JSON import comes in two flavors — don't confuse them:**
- **Settings → Data Backup** (`onImportData` in `src/App.jsx`) is a **replace**: it wipes every mock and setting on this device and restores exactly what's in the backup file. This is the `scores.json` / full-export workflow above.
- **Mock Log → Import JSON** and **Mock Analysis → Import JSON** (see §4.1) are **additive**: they add to what's already logged without touching existing mocks. These exist so the tedious parts of data entry — logging many past mocks at once, or filling in a full per-question analysis table — can be done by pasting/uploading JSON instead of clicking through the form.

---

## 4. Feature Scope

### 4.1 Entry & Data Management
- **Mock Log:** fast score-entry workflow for date/source/section scores, plus a parent mock list showing analysis status
- Form to add one row per section per mock (all required fields validated; optional fields clearly marked optional)
- **Mock Log → Import JSON** (additive, appends to existing mocks — see the callout in §3): accepts one mock object, an array of mocks, or `{ "mocks": [...] }`. Each mock:
  ```json
  {
    "date": "2026-07-20",
    "source": "SIMCAT 6",
    "sections": [
      { "section": "VARC", "score": 42, "totalQuestions": 22, "percentile": 91.2, "topperScore": 58 },
      { "section": "DILR", "score": 30, "totalQuestions": 20 },
      { "section": "Quant", "score": 18, "totalQuestions": 22 }
    ]
  }
  ```
  - `sections` may also be an object keyed by section name instead of an array.
  - `score` and `manualTotalMarks` are both accepted as the section score field.
  - `questionBlocks` per section is optional — when omitted, one block spanning all questions is generated automatically (same fallback the manual form uses). When supplied, blocks must fully and exactly cover `1..totalQuestions` (same rule the manual "Customize question structure" editor enforces — both paths share one validator, `validateSectionBlockCoverage` in `src/lib/mockModel.js`).
  - An optional per-mock `analysis` field (same shape as the Mock Analysis JSON below) attaches detailed analysis in the same import.
  - Every mock in the file is validated before any of them are added — one bad entry reports an error and imports nothing, rather than partially importing.
- Edit / delete existing score entries
- Import / export `scores.json` (full backup — see §3)
- Sortable, filterable raw section-entry table is available as a maintenance view under Mock Log
- **Mock Analysis:** separate optional workflow to select an existing mock and attach, edit, inspect, or delete detailed analysis JSON
- **Mock Analysis → Import JSON** (upload a file or paste directly): accepts the same shape described in §1.3 / produced by `normalizeDetailedAnalysis` in `src/lib/analysisModel.js` — `sections` keyed by `VARC`/`DILR`/`Quant` (or `QA` as an alias for Quant), each with `blocks[]` (`type: "set" | "independent"`, optional `topic`), each block's `questions[]` (`result`, `outcomeReason`, `questionType`, `timeTaken`, `averageTime`, `notes`, `topic` for independent questions). Import only replaces the on-screen draft — nothing is saved until "Save analysis" is clicked, which still validates the imported question count and score against the mock's logged data. Use "Download template" on the Mock Analysis tab to get a ready-to-edit JSON file scaffolded from that mock's actual section/question-block structure.

### 4.2 Visualizations
- **Overview:** high-level preparation readout: goals, pacing, weakest-section flag, score-level insights, and broad comparison charts
- Section-wise trend lines over time (VARC / DILR / Quant on the same or separate charts) — primary "who's lagging" view
- Accuracy comparison: overall / MCQ / TITA, both latest mock and rolling average, per section
- Attempt-rate trend per section over time
- Weakest-section auto-flag with a short explanatory note (e.g. "Quant TITA accuracy dropped over last 3 mocks")
- Source-wise comparison (e.g. TIME vs IMS vs actual CAT mocks — useful if difficulty varies by source)
- Percentile trend chart (renders only where percentile data exists)
- Exam hardness indicator (renders only where topper score data exists)
- **Mock Analysis insights:** detailed reason, timing, confidence, decision-quality, mistake, strength, weakness, and section-level pattern views from attached analysis


## 5. Tech Stack

- **React** (single-file component to start, ports cleanly to a full project)
- **Recharts** for all charts/trend lines
- **JSON** for data storage/import/export (no xlsx, no database)
- No backend, no auth, no server-side code — fully static
- Deployment: GitHub repo → Vercel (free tier), via a standard Vite + React scaffold

---

## 6. Decisions Resolved

- **Total Marks:** Auto-calculated by the app, not manually entered. Formula: +3 per Right MCQ, +3 per Right TITA, −1 per Wrong MCQ, 0 per Wrong TITA, 0 per Unattempted. This also acts as a built-in cross-check against manual entry errors — you no longer enter Total Marks at all, removing that error source entirely.
- **Attempt Rate:** Total Questions in Section is now a required field (entered per mock, since section question counts vary — e.g. 22, 24, 25 across different sources), making true Attempt Rate directly computable rather than an estimate.

---

*This document reflects the finalized scope as of the planning conversation. Any changes to fields, phases, or tech choices should be edited here before the next build session.*
