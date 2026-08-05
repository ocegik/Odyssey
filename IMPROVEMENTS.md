# Odyssey — Improvement Report

*Reviewed 2026-07-31 against `main` @ 27cfc2a. Effort tags: **S** ≈ under an hour, **M** ≈ a sitting, **L** ≈ a weekend.*

---

## 0. Where the app stands

The foundation is genuinely good and worth saying plainly, because most of what follows builds on it rather than replacing it:

- **The math is honest.** `mockTotalMarks` returning `null` not `0`, `percentile.js` refusing to pass a sectional average off as an overall percentile, `scoreLeak.js` deriving the penalty from the entered score instead of guessing the MCQ/TITA split — these are the decisions that separate a tracker you can trust from one that quietly lies to you after 20 mocks.
- **Progressive analysis works.** `Unreviewed` as a first-class result, distinct from `Skipped`, is the design choice that makes per-question review actually happen instead of being abandoned halfway.
- **The persistence layer is factored correctly.** `useCloudSyncedState` with the "don't clobber local edits mid-fetch" rule is the right abstraction, arrived at the hard way.
- 26 tests pass, all on the pure scoring functions — the right things to have covered first.

The gaps below are mostly about *reach*: data that's already captured but never joined, and a few places where the codebase has outgrown its file layout.

---

## 1. Structural — highest leverage first

### 1.1 The README describes a data model the app doesn't implement — **M**

This is the single biggest source of future confusion, because the README is the stated source of truth ("*any changes should be edited here before the next build session*").

| README says | Code actually does |
|---|---|
| §1.1 required fields: Attempted MCQ, Attempted TITA, Right MCQ, Right TITA, Wrong MCQ, Wrong TITA | `mockModel.js` stores `attempted`, `correct`, `manualTotalMarks`. No MCQ/TITA split at score-entry level. |
| §6 "Total Marks: auto-calculated… **you no longer enter Total Marks at all**" | `validateMockForm` **requires** a manually entered `score` per section; `attempted`/`correct` are optional. |
| §2 "MCQ Accuracy", "TITA Accuracy", "Negative Marks Lost estimate" | Not computed anywhere. `scoreLeak.js:4` states the opposite outright: *"The app doesn't store the MCQ/TITA split."* |
| §4.2 "Accuracy comparison: overall / MCQ / TITA" | `AccuracyComparisonChart` renders one `Overall` bar. |

The implemented model is the *better* one — entering the final score and deriving the penalty from it needs no assumption about which wrongs were TITA, and that's exactly what makes `sectionLeak` exact rather than modelled. So the fix is to **rewrite the README to match the code**, not the reverse. Cut §1.1's six MCQ/TITA fields down to `attempted` / `correct` / `score` / `totalQuestions`, delete the "auto-calculated" claim in §6, and move MCQ/TITA accuracy out of §2 into §1.3 where it belongs — as something derivable *from analysis*, once built (see [3.6](#36-mcq-vs-tita-accuracy-split--s)).

Also worth a one-line note: `AccuracyComparisonChart` renders a `<Legend>` for a single series. Drop it (**S**).

### 1.2 Two topic taxonomies that never meet — **L, but the biggest feature unlock in the app**

There are two independent vocabularies for the same concept:

- `analysisModel.js → TOPIC_OPTIONS` — 5 Quant topics, 5 DILR, 2 VARC. What per-question analysis tags against.
- `syllabusData.js → SYLLABUS_TREE` — ~768 lines, hierarchical: section → macro topic (`varc-rc`) → micro topic (`varc-rc-inference`) → question types, each with a `frequency` weighting.

They share no ids and no names. Consequence: **the Syllabus tab is a checklist that has never once been informed by how you actually perform.** You can mark "Para-jumbles" complete while scoring 20% on VARC and nothing anywhere notices.

The scaffolding for the join already exists and is explicitly commented as intentional — `useSyllabus.js:28` reserves `mockAccuracy`, `attempts`, `priorityScore`, `revisionHistory`, `masteryLevel` per micro topic, and notes *"Only `completed` is actually written to today."* The only missing piece is a shared taxonomy.

Recommended shape: make `TOPIC_OPTIONS` **derive** from the syllabus tree rather than being a hand-maintained parallel list — analysis tags at macro-topic granularity (`varc-rc`, `quant-arithmetic`), which is roughly what the current options already are, and micro topics stay a syllabus-only refinement. Once tagged by id, `buildTopicRecords` in `advancedInsights.js` can write straight back into the reserved progress fields, and everything in §3.5–3.7 below becomes near-free.

### 1.3 `AnalysisTab.jsx` is 907 lines and holds four features — **M**

Twelve `useState` hooks, four `useEffect`s, plus a draft editor, a paper-structure editor, a JSON import panel, and a template exporter. It's the file that will resist every future change. Natural seams, in the order they'd pay off:

1. `useAnalysisDraft(mock)` — the draft state plus `buildAnalysisDraftFromMock` / `mergeDraftOntoMockStructure` / the sync effects. This is the genuinely hard logic and deserves its own tested module.
2. `<AnalysisStructureEditor>` — `structureForm` / `structureErrors` / `mockFromStructurePayload`.
3. `<AnalysisImportPanel>` — paste/upload/template-download, all four of its state vars.
4. `<AnalysisQuestionTable>` — the per-question row rendering.

Same note, lower urgency, for `syllabusData.js` (768 lines): it's *data*, not logic, sitting in `src/lib` and bundled into the syllabus chunk. Moving it to a JSON asset would shrink that chunk and stop it being diffed as code.

### 1.4 Two styling systems running in parallel — **M**

524 inline `style={{…}}` objects against 553 Tailwind `className`s. Every card in the app repeats the same literal:

```js
style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
```

Meanwhile `tailwind.config.js` has a completely empty `theme.extend` — while `App.jsx` already emits every color as a CSS custom property. Mapping those variables into the Tailwind theme is ~15 lines and turns most of those 524 objects into `bg-surface border border-border rounded-xl shadow-card`. Benefits beyond tidiness: object literals rebuild on every render, can't be deduplicated by the CSS layer, and can't be targeted by a media query — which is why dark-mode currently needs the `!important` override block at `App.jsx:194-201`.

Start with a `<Card>` primitive in `components/ui/` — the `Panel` component is already independently redefined in `MockLogTab.jsx:18`, `AnalysisTab.jsx:26`, and `AnalysisInsightsDataTab.jsx:12`.

### 1.5 Cloud sync is last-write-wins with no conflict guard — **M**

`useCloudSyncedState` protects the *initial fetch* from clobbering local edits. Nothing protects the reverse. Open the app on a laptop and a phone: the second device's debounced push overwrites whatever the first one saved, silently, with no version check — and since each key stores the entire slice as one JSON blob, that's every mock, not one field.

The table already has `updated_at`. Three escalating fixes:

- **S** — read `updated_at` on fetch, keep it in a ref, send it as a `.eq("updated_at", known)` guard on upsert. A failed match means someone else wrote; surface it via the existing `SYNC_STATUS.error` path rather than overwriting.
- **S** — `supabase.channel()` on the `app_storage` row. The dependency is already installed; a live subscription makes the second device *converge* instead of conflict.
- **M** — snapshot the previous value into a `app_storage_history` table (or just the last 3 into localStorage) on every destructive write.

Related and worth its own line: **`handleImportData` in `App.jsx:160` replaces the entire dataset with no undo.** Delete-a-mock has an Undo toast; "restore a backup over 40 logged mocks" does not. Snapshotting the pre-import dataset and offering the same Undo affordance is **S** and removes the app's scariest button.

### 1.6 Supabase RLS is wide open — **S to mitigate, M to fix properly**

`schema.sql` grants `anon` full read/write on `app_storage` with `using (true)`, and the anon key ships in a public static bundle. The comment acknowledges the tradeoff, which is fair for a single-user project — but two things make it sharper than the comment suggests:

1. The README now positions Supabase as the **durable copy** and localStorage as "a fast local cache." Anyone who views source on the deployed site can `delete from app_storage` — and the durable copy is the one that gets restored.
2. The `key` namespace is global (`"entries"`, `"settings"`, `"syllabus"`). If this is ever shown to a second person on the same deployment, they don't get their own data — they get *yours*, and overwrite it.

Cheapest real fix: Supabase **anonymous auth** (`signInAnonymously`), add a `user_id uuid default auth.uid()` column, change the policy to `using (user_id = auth.uid())`. That's a per-device identity with no login UI, and it makes the table multi-user by construction. Keep the export/import path as the recovery mechanism for a lost anonymous session.

### 1.7 No linter, no formatter, no CI — **S**

No `.eslintrc`, no `.prettierrc`, no `.github/`. `npm test` covers pure scoring functions only — there is no component test anywhere, so a crash in `AnalysisTab`'s 907 lines is caught by the error boundary at runtime, not at commit time. A GitHub Action running `npm test && npm run build` on push is ten lines and catches the whole class of "broken import" and "renamed export" errors. `eslint-plugin-react-hooks` in particular would be earning its keep here — there are five `eslint-disable-next-line react-hooks/exhaustive-deps` comments with no ESLint installed to disable.

---

## 2. Refining what's already built

Small, concrete, mostly independent.

### 2.1 The null-vs-zero doctrine leaks in `MockLogTable` — **S**

The README calls this out explicitly as a correctness rule, and two places in the same file break it:

- **`MockLogTable.jsx:158`** — `(mockTotalMarks(a) - mockTotalMarks(b)) * dir`. `mockTotalMarks` returns `null` for an unscored mock; `null - 120` coerces to `-120`, so sorting by Marks ranks unscored mocks as if they scored zero.
- **`MockLogTable.jsx:244-245`** — `sum + (mock[section]?.totalMarks || 0)` then `mock.manualTotalMarks ?? sectionMarks`. An unscored mock displays a confident **`0`** in the Marks column — precisely the "indistinguishable from a genuine zero" case the README warns about.

Both fix by routing through `mockTotalMarks` and rendering `—` for `null` (`fmtNum` likely already handles it).

### 2.2 Two different mock label formats — **S**

`compute.js:59` builds `${fmtDate(date)} · ${source}`; `OverviewTab.jsx:27` independently builds `${fmtDate(date)} - ${source}`. So the Overall-marks chart's x-axis uses a hyphen while every other chart uses a middot, for the same mock. Export `mockLabel(mock)` from `compute.js` and use it in both.

### 2.3 College cutoffs carry sectional requirements that are never checked — **S, high value**

`collegeCutoffs.js` has `varc`, `dilr`, `qa` percentile requirements on nearly every entry — IIM Lucknow needs 77/77/77, IIM Mumbai 80.35/89.29/89.23. `CollegeTargetsPanel` **prints them as static text** (`:61-63`) and computes reach from the overall percentile alone (`reachStatus`).

But sectional percentiles are logged per mock and already flow into `buildPercentileSeries`. Comparing them is a handful of lines and changes the answer materially: a 97.5 overall with a 62 DILR is *not* within reach of IIM Lucknow, and the panel currently says it is. Show it as a per-section pass/fail row inside the expanded college, and let `countWithinReach` account for sectional gates.

### 2.4 `negativeCost` clamps away a data-entry error instead of reporting it — **S**

`scoreLeak.js:54` does `Math.max(0, correct * 3 - marks)`, with the comment noting that hitting the clamp means the logged score and correct-count disagree. That's true — and it's *useful information about a mistake the user made*, currently swallowed. When the clamp engages, surface it: "Your logged VARC score (48) is higher than 3 × correct (14) allows — check the entry." Same for the `attempted > questions || correct > attempted` early return at `:35`, which today just makes the whole panel silently render nothing.

### 2.5 `latestKnownPercentile` computes `mocksAgo` but nothing displays it — **S**

`percentile.js:52` returns `mocksAgo` specifically so the UI can say *"as of 3 mocks ago"* rather than implying it's current — and the docblock says so. `OverviewTab.jsx:125` uses the value and drops the staleness. One span in the College-targets summary line closes the loop.

### 2.6 Accessibility gaps — **S each**

20 aria attributes across 9 files, concentrated in `MockLogTable` and `CommandPalette` (which are done well). The gaps:

- **`TabNav`** — a `<nav>` of plain buttons with no `role="tablist"` / `role="tab"` / `aria-selected`, and no `aria-current` on the active tab. Active state is conveyed by background color alone.
- **Charts** — no text alternative anywhere. Recharts renders SVG with no `<title>`/`aria-label`; a screen reader gets nothing from any of the eleven charts. `ChartFrame` is the single place to add `role="img"` + a generated `aria-label` from the series summary.
- **Section color coding** — VARC orange / DILR green / Quant blue is the app's core visual language, and on the line charts it's the *only* differentiator between series. Distinct stroke dash patterns per section would carry the same information for a red-green colorblind user at zero cost.
- **`window.confirm` for delete** (`MockLogTable.jsx:254`) — the app already has a Toast-with-Undo pattern that's strictly better; delete already wires an Undo action in `useMockEntries.js:128`. The confirm dialog is redundant with it *and* its message ("This can't be undone") is now false.

### 2.7 Small correctness nits — **S**

- `generateInsights` caps at `MAX_INSIGHTS = 4` with one insight per generator type — meaning at most 4 insights ever, from 4 generators, so the cap never actually binds. Either add generators or drop the cap; as written it reads as protection that isn't.
- `rollingSeries` windows by *row count*, not time. Five mocks spread over three months average as readily as five in a fortnight. Worth at least a tooltip note; a `days`-bounded variant would be more honest for the pacing story.

---

## 3. New features, ranked by value per unit of effort

Everything here is built on data the app **already captures**. Nothing needs a new input field.

### 3.1 Score → percentile predictor from your own logged pairs — **M**

You store `score` *and* `percentile` per section per mock. After ~8 mocks that's a usable score↔percentile curve, per source. Fit it (a monotonic spline, or just linear interpolation between sorted logged pairs) and you can answer the question the app currently can't: **"at 108 marks, what percentile am I looking at?"**

That single number turns the Overall-marks chart from a line into a decision tool, feeds a far better College-targets comparison than the sectional-average estimate, and makes the `overallTargetPercentile` setting actionable — it can finally be translated into a marks target. Guard it the way `percentile.js` already guards estimates: label it clearly, report the sample size it's fitted from, and refuse below a threshold.

### 3.2 Required trajectory, not a flat target line — **S**

`MultiSectionLineChart` draws `overallTargetMarks` as a flat dashed reference. But `computePacing` already knows `daysRemaining` and `recentPerWeek` — so you can compute how many mocks remain before the exam, and draw the **slope you'd need to hit the target from where you are.** "You need +2.4 marks per mock across the ~11 mocks you'll fit in" is a far more motivating and honest line than a static ceiling. `computeAdaptiveTarget`'s flat +5 step is the same idea already half-built; this generalizes it.

### 3.3 Back-solve section targets from a chosen college — **M**

Today: you type target marks per section in Settings, and `SectionTargetPanel` shows the gap. Invert it. Pick "IIM Lucknow" in College targets → the app knows it needs 77/77/77 sectional + 97.68 overall → with the [3.1](#31-score--percentile-predictor-from-your-own-logged-pairs--m) curve, that becomes required *marks* per section → against your current rolling accuracy, that becomes **required attempts per section**. That's the complete "what do I actually have to do differently" loop, and every input already exists.

### 3.4 Marks-per-minute, and the DILR set-selection counterfactual — **M, and the most CAT-specific thing you could build**

`buildSetRecords` already computes per-set `totalTime`, `accuracy`, `attempted`, and `correct`. It reports time *against benchmark* but never the thing that decides a DILR section: **marks per minute.** `(3 × correct − penalty) / totalTime` ranks sets by actual return on time spent.

Then the counterfactual, which nothing else on the market does well: *"You spent 19 minutes on Set 3 for 3 marks. Set 4, which you skipped, ran at 1.1 marks/min for you historically on that topic. Trading them was worth ~+9 marks."* Set selection is the single highest-leverage DILR skill and this is the only place the data to teach it exists — you're storing per-question time and per-set topics already.

### 3.5 Revision queue from wrong answers — **M** *(needs [1.2](#12-two-topic-taxonomies-that-never-meet--l-but-the-biggest-feature-unlock-in-the-app))*

Every question tagged `result: "Wrong"` + `outcomeReason: "Concept Error"` + a topic is a **known, specific gap with a date attached.** Right now that produces a prose insight and nothing else. Turn it into a due list on a 3/7/21-day spacing, writing into the `revisionHistory` and `masteryLevel` fields `useSyllabus` already reserves. This is the step that makes the app tell you *what to do tomorrow morning*, not just what happened last Sunday.

### 3.6 MCQ vs TITA accuracy split — **S** *(and it closes the §1.1 README gap)*

`questionType` is stored per question and `analysisValidation.js:6` already encodes the asymmetric marking. `summarizeQuestions` counts `questionTypeCounts` but never splits accuracy by it. Adding that split is a few lines, and it delivers the exact diagnostic the README has promised since day one — *is the gap MCQ or TITA?* — from analysis data rather than from six extra fields at entry time. This is the right way to honor the original spec.

### 3.7 "Marked complete, still weak" — **S** *(needs [1.2](#12-two-topic-taxonomies-that-never-meet--l-but-the-biggest-feature-unlock-in-the-app))*

One join, one table. Micro topics with `completed: true` whose corresponding mock accuracy is below ~50%. With four months out and Quant being rebuilt from fundamentals, "you've ticked this off but the data disagrees" is probably the most valuable single screen the app could show — and it's a `filter` once the taxonomies share ids.

### 3.8 Activate `mockSchedule` — **S**

Settings supports a full schedule with `fixed`/`range`/`flexible` date types and validated windows — real modelling effort — and it currently only feeds the countdown. Cheap payoffs: "Next mock: SIMCAT 9, Sunday" on Overview; on the day, a pre-filled log form; and when logging, "last time on SIMCAT you scored 94 — here's your average on this source."

### 3.9 PWA install + offline — **S**

It's already a static site whose data lives in localStorage with a cloud mirror — it *works* offline today, it just can't be installed. A manifest plus a minimal service worker makes it a home-screen app on a phone, which for a "log the mock right after finishing it" workflow is where the friction actually is. `public/` already has the icons.

### 3.10 CSV export — **S**

JSON round-trips perfectly for backup, but nobody pivots JSON. One flattened CSV of `entriesWithComputed` (which already exists, fully derived) lets any of this be dropped into a spreadsheet for the one-off question the app doesn't answer.

---

## 4. Suggested order

| # | Item | Effort | Why now |
|---|---|---|---|
| 1 | README ↔ code reconciliation ([1.1](#11-the-readme-describes-a-data-model-the-app-doesnt-implement--m)) | M | Every future decision is made against this document |
| 2 | Null-vs-zero leaks, label format, import undo ([2.1](#21-the-null-vs-zero-doctrine-leaks-in-mocklogtable--s), [2.2](#22-two-different-mock-label-formats--s), [1.5](#15-cloud-sync-is-last-write-wins-with-no-conflict-guard--m)) | S | Correctness bugs in the doctrine the app is built on |
| 3 | Sync conflict guard + anonymous auth ([1.5](#15-cloud-sync-is-last-write-wins-with-no-conflict-guard--m), [1.6](#16-supabase-rls-is-wide-open--s-to-mitigate-m-to-fix-properly)) | S/M | Data loss risk grows with every mock logged |
| 4 | ESLint + CI ([1.7](#17-no-linter-no-formatter-no-ci--s)) | S | Cheapest possible safety net before the refactors below |
| 5 | Score→percentile predictor ([3.1](#31-score--percentile-predictor-from-your-own-logged-pairs--m)) | M | Unlocks 3.2 and 3.3; highest standalone value |
| 6 | Unify topic taxonomy ([1.2](#12-two-topic-taxonomies-that-never-meet--l-but-the-biggest-feature-unlock-in-the-app)) | L | Gates 3.5 and 3.7, the two features that make the app prescriptive |
| 7 | Split `AnalysisTab` ([1.3](#13-analysistabjsx-is-907-lines-and-holds-four-features--m)) | M | Do it before the next analysis feature, not after |
| 8 | Tailwind theme + `<Card>` ([1.4](#14-two-styling-systems-running-in-parallel--m)) | M | Pure cleanup — safe to defer, cheaper the sooner it's done |

The quickest genuinely-visible wins, if you want one sitting's worth: **2.3** (sectional college gates), **3.6** (MCQ vs TITA split), **3.2** (required trajectory line). All three are small, all three use data you already have, and all three change what the app actually tells you.
