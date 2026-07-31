import { SECTIONS } from "../constants";

/* CAT marking: +3 for a right answer, and a wrong MCQ costs 1 mark (wrong
   TITA costs nothing). The app doesn't store the MCQ/TITA split, so rather
   than guessing it, the penalty below is derived from the score that was
   actually entered — see `negativeCost`. */
export const MARKS_PER_CORRECT = 3;

/**
 * Where a section's marks went, relative to the perfect score.
 *
 * The decomposition is exact rather than modelled — the three costs always
 * sum to `ceiling - marks`:
 *
 *   ceiling            = questions x 3          (everything right)
 *   unattemptedCost    = unattempted x 3        (marks never contested)
 *   wrongCost          = wrong x 3              (contested and missed)
 *   negativeCost       = (correct x 3) - marks  (actually deducted)
 *
 * negativeCost falls out of the entered score, so it needs no assumption
 * about which wrong answers were MCQ vs TITA: whatever the paper's marking
 * scheme did to you is already baked into the score you logged.
 *
 * Returns null unless the section has all four inputs — this is a precise
 * breakdown or nothing, not a partially-guessed one.
 */
export function sectionLeak(entry) {
  const questions = entry?.totalQuestions;
  const attempted = entry?.attempted;
  const correct = entry?.correct;
  const marks = entry?.totalMarks;

  if (!Number.isFinite(questions) || questions <= 0) return null;
  if (!Number.isFinite(attempted) || !Number.isFinite(correct) || !Number.isFinite(marks)) return null;
  if (attempted > questions || correct > attempted) return null;

  const wrong = attempted - correct;
  const unattempted = questions - attempted;
  const ceiling = questions * MARKS_PER_CORRECT;

  return {
    section: entry.section,
    questions,
    attempted,
    correct,
    wrong,
    unattempted,
    marks,
    ceiling,
    unattemptedCost: unattempted * MARKS_PER_CORRECT,
    wrongCost: wrong * MARKS_PER_CORRECT,
    // Clamped at 0: a logged score above 3 x correct means the score and the
    // correct-count disagree, and a negative "penalty" would be nonsense.
    negativeCost: Math.max(0, correct * MARKS_PER_CORRECT - marks),
  };
}

const emptyTotals = (section) => ({
  section,
  mocks: 0,
  marks: 0,
  ceiling: 0,
  unattemptedCost: 0,
  wrongCost: 0,
  negativeCost: 0,
});

function withShares(totals) {
  const lost = totals.unattemptedCost + totals.wrongCost + totals.negativeCost;
  return {
    ...totals,
    lost,
    // Per-mock averages are what's actually comparable across sections — a
    // section logged in more mocks would otherwise always look like the
    // bigger leak just for having more data.
    perMock: totals.mocks
      ? {
          marks: totals.marks / totals.mocks,
          unattemptedCost: totals.unattemptedCost / totals.mocks,
          wrongCost: totals.wrongCost / totals.mocks,
          negativeCost: totals.negativeCost / totals.mocks,
        }
      : null,
    conversion: totals.ceiling > 0 ? totals.marks / totals.ceiling : null,
  };
}

/**
 * Rolls `sectionLeak` up across the most recent `lastN` mocks per section
 * (all of them when `lastN` is null), so the panel reflects current form
 * rather than being anchored by mocks from months ago.
 */
export function aggregateScoreLeak(entriesWithComputed, lastN = 5) {
  const bySection = {};
  SECTIONS.forEach((section) => {
    const leaks = entriesWithComputed
      .filter((entry) => entry.section === section)
      .map(sectionLeak)
      .filter(Boolean);
    const windowed = lastN ? leaks.slice(-lastN) : leaks;

    const totals = windowed.reduce((acc, leak) => ({
      ...acc,
      mocks: acc.mocks + 1,
      marks: acc.marks + leak.marks,
      ceiling: acc.ceiling + leak.ceiling,
      unattemptedCost: acc.unattemptedCost + leak.unattemptedCost,
      wrongCost: acc.wrongCost + leak.wrongCost,
      negativeCost: acc.negativeCost + leak.negativeCost,
    }), emptyTotals(section));

    bySection[section] = withShares(totals);
  });

  const covered = SECTIONS.filter((section) => bySection[section].mocks > 0);
  return {
    bySection,
    sectionsWithData: covered,
    /* The single biggest recoverable pool of marks, per mock — what to
       actually go and fix. Unattempted marks are recoverable by attempting
       more; wrong answers by accuracy work; negatives by better selection. */
    biggestLeak: findBiggestLeak(bySection, covered),
  };
}

/* `fix` carries its own article so callers can drop it straight into a
   sentence without an a/an special case. */
const LEAK_KINDS = [
  { key: "unattemptedCost", label: "questions left unattempted", fix: "an attempt-rate" },
  { key: "wrongCost", label: "attempts that went wrong", fix: "an accuracy" },
  { key: "negativeCost", label: "negative marking", fix: "a question-selection" },
];

function findBiggestLeak(bySection, covered) {
  let best = null;
  covered.forEach((section) => {
    const perMock = bySection[section].perMock;
    if (!perMock) return;
    LEAK_KINDS.forEach((kind) => {
      const value = perMock[kind.key];
      if (value > 0 && (!best || value > best.value)) {
        best = { section, kind: kind.key, label: kind.label, fix: kind.fix, value };
      }
    });
  });
  return best;
}
