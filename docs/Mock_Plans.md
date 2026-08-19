No files were modified.

## 1. Current structure

The app currently treats every record as a “mock” parent with up to three child sections: VARC, DILR, and Quant. The log form always creates all three sections and requires an overall percentile; the detailed-analysis view selects a mock separately through in-memory `analysisMockId` state. See [mockFormModel.js](/Users/mohitchoudhary/Downloads/Odyssey/src/lib/mockFormModel.js:93), [mockModel.js](/Users/mohitchoudhary/Downloads/Odyssey/src/lib/mockModel.js:73), and [App.jsx](/Users/mohitchoudhary/Downloads/Odyssey/src/App.jsx:253).

The navigation has separate “Mock log” and “Mock analysis” tabs. The log table can open a mock’s analysis, which switches tabs; Analysis then presents a global mock picker. This is the split to remove.

Storage is already close to supporting Sectionals: the parent/child model permits a mock with only one section. However, it has no explicit test type, so a one-section record is ambiguous: it could be an incomplete Full Mock or a Sectional.

Most reporting currently treats all records as comparable full mocks:

- Overview totals, percentile, adaptive targets, and score trends use every record.
- Section trends, score-leak analysis, and target comparisons consume every section entry.
- Detailed insights, topic metrics, and revision queues aggregate analysis from every mock.
- Community/admin counts and leaderboard queries assume every parent row is a mock.

Without a type boundary, Sectionals would contaminate Full Mock baselines and overall-score metrics.

## 2. Proposed structure

Replace the two tabs with one top-level **Mocks** section.

```text
Mocks
├─ History
│  ├─ All tests | Full Mocks | Sectionals
│  ├─ Section / source / date / analysis-status filters
│  └─ Unified chronological test history
└─ Selected test detail
   ├─ Performance summary
   ├─ Test metadata and edit/delete actions
   └─ Detailed analysis
```

Recommended flow:

1. User opens **Mocks** and sees one unified history.
2. “Log test” opens a compact type choice: **Full Mock** or **Sectional**.
3. A Full Mock logs all three sections and overall metrics.
4. A Sectional asks for VARC, DILR, or QA, then shows only that section’s fields.
5. Clicking a history row opens that test’s detail view within Mocks.
6. The detail view contains the existing analysis editor rather than sending the user to another global tab.

The history list should make type unmistakable:

- `Full Mock` badge, followed by VARC / DILR / QA score snippets, total marks, overall percentile, and analysis completion.
- `Sectional · VARC`, `Sectional · DILR`, or `Sectional · QA` badge, followed by that section’s score, attempts, accuracy, percentile, elapsed time, and analysis completion.
- Do not show “overall marks” or “overall percentile” on a Sectional.

## 3. Data/model changes

Keep the physical `mocks` table for compatibility, but treat it in application language as a generic **test record**.

Recommended contract:

```js
{
  id,
  testType: "full_mock" | "sectional",
  focusSection: "VARC" | "DILR" | "Quant" | null,
  date,
  source,
  overallPercentile, // Full Mock only
  sections: {
    VARC: {
      manualTotalMarks,
      totalQuestions,
      attempted,
      correct,
      percentile,
      timeSpentSeconds,
      timeLimitSeconds,
      questionBlocks,
      notes
    }
  },
  analysis
}
```

Key decisions:

- Keep `Quant` as the internal canonical key to preserve the current topic registry and analysis data. Display it as **QA** in new user-facing sectional UI; accept both “QA” and “Quant” in imports.
- Add explicit `testType`; never infer a Sectional solely from having one child section.
- Add `focusSection` for Sectionals. This prevents a malformed or incomplete record from being misidentified.
- Store timing at the section level in seconds. A Full Mock’s total elapsed time can be derived from its sections; a Sectional’s time is its sole section’s time.
- Keep manually logged elapsed time separate from question-review timing. The sum of detailed-analysis `timeTaken` values may be partial and must not overwrite elapsed test time.
- Treat `manualTotalMarks` on a Sectional as a section score, not an “overall” score.

Persistence changes:

- Bump the local/export dataset version.
- Add `test_type` and `focus_section` to `public.mocks`; add `time_spent_seconds` and optionally `time_limit_seconds` to `public.sections`.
- Add a database check for valid types and focus section values. Enforce the cross-row rules—Full Mock versus exactly one matching Sectional section—in application validation, with a later database trigger only if stricter enforcement is needed.
- Update the Supabase adapters in [cloudStore.js](/Users/mohitchoudhary/Downloads/Odyssey/src/lib/cloudStore.js:313) to read/write these fields.
- Default all existing records to `full_mock`. Do not guess that historic one-section records were Sectionals.
- Keep old imports valid by defaulting omitted `testType` to Full Mock; new documented Sectional imports must declare it.

Also consolidate the current mixed views: some consumers use nested `mock.sections.VARC`, others use pivoted `mock.VARC`. Introduce one typed derived “test view” and selectors such as `fullMocks`, `sectionals`, and `sectionalsBySection` so type filtering is centralized.

## 4. UI/UX changes

### Logging

Full Mock form:

- Current three-section layout.
- Overall marks derived from sections.
- Overall percentile shown only here.
- Optional per-section time and section percentile.

Sectional form:

- Type badge and section picker first.
- One contextual section card only.
- Score, total questions, attempted, correct, section percentile, actual time, time limit, notes, and optional question structure.
- Defaults by section, including appropriate VARC/DILR set structures.
- Button copy: “Log sectional,” not “Log mock.”

### Detail and analysis

The existing analysis editor already builds a one-section draft reasonably well. Adapt its shell:

- Rename “Mock Analysis” to “Test Analysis.”
- Replace its global test dropdown with the selected-test context from Mocks.
- For a Sectional, render one section summary and one question-analysis panel.
- Use “Test reflection” rather than “Overall reflection” in the UI, while retaining the stored field initially for backward compatibility.
- Preserve the current analysis template/import/export mechanics, but include test type and focus section in generated templates.

### Tracking and reporting

Use explicit scopes:

- **Overview, college targets, overall percentile, adaptive targets, and total-mark trends:** Full Mocks only by default.
- **Section performance:** expose a scope switch—Full Mocks, Sectionals, or All attempts—rather than silently mixing them.
- **Trends:** retain Full Mock as the default comparison mode; Sectional mode should filter to one section and compare like-for-like sessions.
- **Detailed Insights:** add test-type and section filters. “All test types” can be an intentional option, not the default.
- **Topic metrics and revision queue:** may combine analyzed questions from both types because they represent learning evidence, but label the scope and retain test-type metadata for future filtering.
- **Community leaderboard:** continue using Full Mocks only, since total sectional scores are not comparable to full-test scores. Count Sectionals separately if surfaced.
- **Admin/community counters:** rename or split “mocks” into Full Mocks and Sectionals rather than inflating mock counts.

## 5. Navigation changes

Replace these current top-level tabs:

- `Mock log`
- `Mock analysis`

with one `Mocks` tab.

Use stable deep links for selected tests, for example `#/mocks/<test-id>`. This makes “Open analysis” a direct Mocks detail link and lets the command palette open the same destination.

Maintain legacy redirects:

- `#/log` → `#/mocks`
- `#/analysis` → `#/mocks`

The global Analysis tab’s selection state can then disappear. The Mocks detail view owns the selected test identity, including next/previous test navigation if desired.

The existing separate “Insights” tab can remain, but should be renamed to “Test Insights” or clearly filter Full Mocks versus Sectionals.

## 6. Dependencies and edge cases

No new third-party dependency is necessary; React, Supabase, and the existing analysis model are sufficient.

Important cases to handle:

- A Sectional must never require or fabricate an overall percentile.
- `0` remains a real score; unknown scores/times stay `null` and display as `—`.
- Do not compare raw marks across Sectionals with different question counts or time limits without showing denominator and scope.
- A Full Mock with missing historical section data remains a Full Mock, marked as incomplete—not reclassified.
- Existing detailed analyses with one section should continue to load.
- Deleting a test must continue to cascade its sections and analysis.
- Import/export, sample data, validation messages, empty states, command-palette text, header copy (“CAT Mock Tracker”), and accessibility labels all need the Full Mock/Sectional vocabulary update.
- Add tests for legacy migration, type/form validation, Sectional timing, deep links, type-aware selectors, and preservation of Full Mock-only overall metrics.

## 7. Recommended implementation order

1. Define the `TestRecord` contract, type rules, timing semantics, and analytics-scope policy.
2. Add backward-compatible dataset normalization and pure tests; default legacy data to Full Mock.
3. Apply additive Supabase migration and update cloud serialization/deserialization.
4. Build type-aware selectors and derived metrics before changing dashboards, so Full Mock and Sectional data cannot mix accidentally.
5. Refactor the log form into a shared test form with Full Mock and Sectional variants.
6. Build the unified Mocks history and test-detail route; move the existing analysis editor into that detail view.
7. Update Overview, Trends, Insights, targets, topic/revision tracking, Community, Admin, imports/exports, and terminology.
8. Add migration, component, and regression coverage; then retire the old `log` and `analysis` navigation paths behind redirects.
