# Odyssey

Odyssey is a personal workspace for CAT preparation. Use it to log mock results, review performance across VARC, DILR, and Quant, track syllabus coverage, and plan revision work.

The app works from the information you enter. Its charts and insights describe recorded patterns; they do not predict official CAT results, admission outcomes, or guaranteed percentiles. Reported percentiles remain tied to the test series and mock in which they were earned.

## Project reference

The remaining sections describe the application’s data model, feature scope, and implementation decisions for contributors and maintainers. They are not end-user guidance.

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

### 1.2 Percentile Fields

| Field | Type | Notes |
|---|---|---|
| Overall Percentile | number \| null | Optional reported percentile in that mock's student pool |
| Section Percentile | number \| null | Optional reported percentile for that section |

### 1.3 Detailed Analysis (optional, separate workflow, progressive)

- Score entry stays lightweight: users can log section scores without entering any question-level detail.
- Every parent mock can optionally have one detailed analysis attached later.
- Detailed analysis stores mock reflection, structure text, section blocks, question outcomes, reason tags, question type, time taken, benchmark time, and notes.
- Analysis data is stored under the same parent mock so future insight modules can use it for recurring mistakes, timing patterns, section trends, and long-term comparisons.
- **Analysis is progressive, not all-or-nothing.** Each question's result is `Correct` / `Wrong` / `Skipped` / `Unreviewed` — `Unreviewed` is the default for anything not yet looked at, distinct from a real `Skipped` in the exam. Saving an analysis always works, however many questions are still `Unreviewed`: those are excluded from scoring and from every downstream stat until revisited. The app cross-checks the analysis against the mock's logged question count and score, but only once nothing is left `Unreviewed` — and even then it's a soft notice, not a blocker. This means a mock can go from "just the score" to "half the questions reviewed" to "fully reviewed" over several sittings, and stays usable at every step (Mock Log shows an "X/Y reviewed" progress badge in the meantime).

---

## 2. Derived / Computed Stats (never stored — always calculated live from raw data)

- **Total Marks (auto-calculated, not entered)** = (Right MCQ × 3) + (Right TITA × 3) + (Wrong MCQ × −1) + (Wrong TITA × 0) + (Unattempted × 0), where Unattempted = Total Questions in Section − Attempted MCQ − Attempted TITA (also derived, not a separate stored field)
  - A mock logged with **no** section scores has a total of `null`, not `0` — see `mockTotalMarks` in `src/lib/compute.js`. A `0` there is indistinguishable from a genuine zero and would drag down best marks, the rolling average, and the adaptive next-mock target.
- Overall Accuracy = (Right MCQ + Right TITA) / (Attempted MCQ + Attempted TITA)
- MCQ Accuracy = Right MCQ / Attempted MCQ
- TITA Accuracy = Right TITA / Attempted TITA
- Attempt Rate (per section) = (Attempted MCQ + Attempted TITA) / Total Questions in Section — now directly computable since Total Questions in Section is a required field
- Marks per Attempt (efficiency indicator)
- Negative Marks Lost estimate = Wrong MCQ × (CAT negative marking value)
- Rolling 5-mock average per section (smooths one-off bad days)
- Weakest Section Flag — lowest rolling accuracy × attempt-rate combination
- Percentile trend using reported overall and section percentiles
- Overall paper-difficulty signals compare your reported overall marks and percentile, keeping the cohort—not one extreme score—as the benchmark
- **Score leak decomposition** (`src/lib/scoreLeak.js`) — splits a section's gap to a perfect score into three causes that each need a different fix:
  - `unattemptedCost` = unattempted × 3 (marks never contested → *attempt rate*)
  - `wrongCost` = wrong × 3 (contested and missed → *accuracy*)
  - `negativeCost` = (correct × 3) − marks (what the penalty actually took → *question selection*)

  The three always sum exactly to `ceiling − marks`. `negativeCost` is derived from the **entered score**, so it needs no assumption about which wrong answers were MCQ vs TITA — the paper's real marking is already baked into the score you logged. Requires `totalQuestions`, `attempted`, `correct` and a score on the same section; it reports nothing rather than guessing from a partial row.

**Overall percentile is optional.** When reported, the app records the actual overall percentile from the mock report and never derives it by averaging section percentiles. `latestKnownPercentile` walks back to the latest mock that has one so mocks without it do not blank the college comparison.

**Rule:** Any chart/stat depending on an optional field simply skips data points where that field is missing — it never blocks rendering of the rest of the dashboard.

---

## 3. Persistence Model

- The app is a **static site** — no custom server is required
- Data is held in browser state while the app is open and, for signed-in users, synced to private Supabase tables
- **Export**: after adding/editing entries, export a backup JSON file
- **Import**: restore that backup JSON if needed; it is a manual recovery path, not the live source of truth
- Recommended workflow: keep periodic exports somewhere safe if you want an independent offline backup
- `scores.json` stores explicit parent mock records; each mock owns its VARC, DILR, and Quant section records instead of inferring the relationship from shared date/source values
- Detailed analysis is optional and stored under the parent mock's `analysis` field when attached
- Older saved entries without an overall percentile remain readable; enter the reported percentile when editing them to use overall percentile features.

**Cloud sync:** when signed in, the app stores private data in normalized Supabase tables: `mocks`/`sections`, one optional `analysis` row per mock, `settings`, and `syllabus`. localStorage is only a fast browser cache; signing out clears all account-scoped cached and in-memory data before another person can use the same browser. Export/import remain available as a manual backup path. The old `app_storage` table is untouched and is not the active application data path. See [`docs/PHASE_1_FOUNDATION.md`](docs/PHASE_1_FOUNDATION.md), `supabase/phase-1-foundation.sql`, and `src/lib/cloudStore.js`.

**JSON import comes in two flavors — don't confuse them:**
- **Account → Data Backup** (`onImportData` in `src/App.jsx`) is a **replace**: it wipes every mock and preference on this device and restores exactly what's in the backup file. This is the `scores.json` / full-export workflow above.
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
    "overallPercentile": 92.4,
    "sections": [
      { "section": "VARC", "score": 42, "totalQuestions": 22, "percentile": 91.2 },
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
- **Mock Analysis → Import JSON** (upload a file or paste directly): accepts the same shape described in §1.3 / produced by `normalizeDetailedAnalysis` in `src/lib/analysisModel.js` — `sections` keyed by `VARC`/`DILR`/`Quant` (or `QA` as an alias for Quant), each with `blocks[]` (`type: "set" | "independent"`), each block's `questions[]` (`result`, `outcomeReason`, `questionType` for MCQ/TITA, `timeTaken`, `averageTime`, `notes`, canonical `topicRef`, and optional semantic `questionTypeRef`). VARC/DILR set topic and semantic question-type tags belong to each question; older block-level tags are migrated down on import. A reference is `{ topicId, source, taxonomyVersion }`, where `topicId` is a syllabus ID such as `qa-arithmetic`; legacy topic strings are still accepted and migrated when safe. A question's `result` may be `"Unreviewed"` (or omitted — it's the default) for anything you don't remember; that question is skipped by scoring and stats until it's updated later. Import only replaces the on-screen draft — nothing is saved until "Save analysis" is clicked. Saving always succeeds (see §1.3); it checks the imported question count and score against the mock's logged data and surfaces any mismatch as a notice, not a blocker. Use "Download template" on the Mock Analysis tab to get a ready-to-edit JSON file scaffolded from that mock's actual section/question-block structure.

### 4.2 Visualizations

**Progressive disclosure.** Overview and Trends each show a short always-visible core, with everything deeper behind collapsible rows (`src/components/ui/Disclosure.jsx`). A collapsed row still carries a one-line summary drawn from real data — "Quant: 56 marks/mock to questions left unattempted", "Most volatile: DILR ±32.0% accuracy" — so it tells you whether opening it is worth the scroll. Open state is remembered per device in localStorage (`useDisclosure`), deliberately *not* synced: which panels you like expanded is a reading preference, not prep data. Collapsed panels don't render their children at all, so stacking several costs nothing.

- **Overview:** high-level preparation readout: goals, pacing, weakest-section flag, score-level insights, and broad comparison charts
  - Always on: countdown, quick stats, latest-mock spotlight, insights, weakest section, syllabus snapshot
  - Behind disclosure: gap to section targets, overall-marks chart
- **Trends:**
  - Always on: section-wise marks trend, accuracy comparison, attempt-rate trend
  - Behind disclosure: where your marks go + marks-per-attempt, percentile trend, section shape (radar), consistency & sources
- **Gap to section targets** (Overview) — the per-section target marks in Account, compared against each section's rolling 5-mock average. Renders only when at least one target is set.
- **College cutoff reference** (Admin only) — static program cutoff data for administration; it is not compared against an individual user's percentile or presented as an admission prediction.
- Section-wise trend lines over time (VARC / DILR / Quant on the same or separate charts) — primary "who's lagging" view
- Accuracy comparison: overall / MCQ / TITA, both latest mock and rolling average, per section
- Attempt-rate trend per section over time
- Weakest-section auto-flag with a short explanatory note (e.g. "Quant TITA accuracy dropped over last 3 mocks")
- Source-wise comparison (e.g. TIME vs IMS vs actual CAT mocks — useful if difficulty varies by source)
- Percentile trend chart (renders only where percentile data exists)
- **Mock Analysis insights:** detailed reason, timing, confidence, decision-quality, mistake, strength, weakness, and section-level pattern views from attached analysis


### 4.3 App shell
- **URL-addressable tabs** — the active tab lives in the URL hash (`#/trends`), so reloads keep your place and any view can be bookmarked or linked. Hash rather than path, to stay a static site with no server rewrite rules (`src/hooks/useHashTab.js`).
- **Command palette** — `⌘K` / `Ctrl-K` opens a search over every tab, every logged mock (jumps straight to its analysis), and the export/theme actions. Everything in it is reachable the normal way too.
- **Sync badge** — the header always shows whether data reached the cloud (`Synced` / `Saving` / `Sync failed` / `This device`), reflecting the *worst* state across the mocks, settings and syllabus slices. Previously only a failed mock save surfaced anything, and settings/syllabus failures were entirely silent.
- **Error boundary** — a render crash shows a recovery screen with a "Download backup" button that reads straight from localStorage, instead of a white screen that's indistinguishable from data loss.

## 5. Tech Stack

- **React** (single-file component to start, ports cleanly to a full project)
- **Recharts** for all charts/trend lines
- **JSON** for data storage/import/export (no xlsx, no database)
- Supabase provides browser-based cloud sync and optional email/password accounts. The Vercel `api/delete-account.js` function handles self-service account deletion using a server-only Supabase service-role key.
- Deployment: GitHub repo → Vercel (free tier), via a standard Vite + React scaffold

### 5.1 Bundle
Tabs are lazy-loaded and recharts is split into its own cached chunk (`vite.config.js`), taking the initial download from **1058 kB → 347 kB**. Overview's one chart is lazy too, so the numbers above it paint before recharts arrives.

### 5.2 Tests
`npm test` (vitest) covers the scoring math where a silent wrong answer would be worst: the score-leak decomposition, `mockTotalMarks` null-vs-zero handling, the adaptive target, and reported-percentile recency. Pure functions only — no DOM harness.

### 5.3 Account deletion deployment setup

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project environment. The service-role key must **not** use a `VITE_` prefix and must never be added to a client `.env` file. The Account page downloads the user's JSON backup before presenting the irreversible deletion confirmation; deleting the Supabase Auth user cascades to their profile, mocks, analyses, settings, and syllabus rows.

### 5.4 Persistence internals
All three synced slices (mocks, settings, syllabus) share `src/hooks/useCloudSyncedState.js` rather than each carrying its own copy of the localStorage-mirror + fetch-reconcile + debounced-push dance. One behavioural rule worth knowing: **the initial remote fetch only replaces local state if the user hasn't edited anything while it was in flight.** Supabase can take seconds on a cold connection, and unconditionally applying the response — as each hook used to — silently discarded anything typed in the meantime.

---

## 6. Decisions Resolved

- **Total Marks:** Auto-calculated by the app, not manually entered. Formula: +3 per Right MCQ, +3 per Right TITA, −1 per Wrong MCQ, 0 per Wrong TITA, 0 per Unattempted. This also acts as a built-in cross-check against manual entry errors — you no longer enter Total Marks at all, removing that error source entirely.
- **Attempt Rate:** Total Questions in Section is now a required field (entered per mock, since section question counts vary — e.g. 22, 24, 25 across different sources), making true Attempt Rate directly computable rather than an estimate.

---

*This document reflects the finalized scope as of the planning conversation. Any changes to fields, phases, or tech choices should be edited here before the next build session.*
