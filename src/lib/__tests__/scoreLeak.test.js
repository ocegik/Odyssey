import { describe, expect, it } from "vitest";
import { aggregateScoreLeak, sectionLeak } from "../scoreLeak";

const entry = (over = {}) => ({
  section: "Quant",
  totalQuestions: 22,
  attempted: 10,
  correct: 6,
  totalMarks: 14, // 6 right (+18) minus 4 wrong MCQs (-4)
  ...over,
});

describe("sectionLeak", () => {
  it("decomposes a section exactly — the costs always close the gap to the ceiling", () => {
    const leak = sectionLeak(entry());
    expect(leak.ceiling).toBe(66);
    expect(leak.unattemptedCost).toBe(36); // 12 unattempted x 3
    expect(leak.wrongCost).toBe(12); //  4 wrong x 3
    expect(leak.negativeCost).toBe(4); //  6x3 - 14
    expect(leak.unattemptedCost + leak.wrongCost + leak.negativeCost).toBe(leak.ceiling - leak.marks);
  });

  it("derives the penalty from the logged score, so TITA (no negative) needs no special case", () => {
    // Same counts, but every wrong answer was TITA — score is 18, not 14.
    const leak = sectionLeak(entry({ totalMarks: 18 }));
    expect(leak.negativeCost).toBe(0);
    expect(leak.unattemptedCost + leak.wrongCost + leak.negativeCost).toBe(leak.ceiling - leak.marks);
  });

  it("clamps a contradictory score rather than reporting a negative penalty", () => {
    // 6 correct can't yield 25 marks; the entry disagrees with itself.
    expect(sectionLeak(entry({ totalMarks: 25 })).negativeCost).toBe(0);
  });

  it("returns null unless every input is present — it is exact or nothing", () => {
    expect(sectionLeak(entry({ attempted: null }))).toBeNull();
    expect(sectionLeak(entry({ correct: undefined }))).toBeNull();
    expect(sectionLeak(entry({ totalMarks: null }))).toBeNull();
    expect(sectionLeak(entry({ totalQuestions: 0 }))).toBeNull();
  });

  it("rejects impossible counts instead of producing negative costs", () => {
    expect(sectionLeak(entry({ attempted: 30 }))).toBeNull(); // more attempts than questions
    expect(sectionLeak(entry({ correct: 11 }))).toBeNull(); // more correct than attempted
  });
});

describe("aggregateScoreLeak", () => {
  it("averages per mock and names the biggest recoverable pool", () => {
    const entries = [
      entry({ section: "Quant", attempted: 4, correct: 4, totalMarks: 12 }), // mostly unattempted
      entry({ section: "VARC", totalQuestions: 24, attempted: 22, correct: 10, totalMarks: 18 }),
    ];
    const leak = aggregateScoreLeak(entries, 5);

    expect(leak.sectionsWithData).toEqual(["VARC", "Quant"]);
    expect(leak.bySection.Quant.perMock.unattemptedCost).toBe(54); // 18 unattempted x 3
    expect(leak.biggestLeak.section).toBe("Quant");
    expect(leak.biggestLeak.kind).toBe("unattemptedCost");
    // DILR was never logged, so it reports no data rather than zeros.
    expect(leak.bySection.DILR.mocks).toBe(0);
    expect(leak.bySection.DILR.perMock).toBeNull();
  });

  it("only looks at the last N mocks, so old form doesn't anchor the read", () => {
    const stale = Array.from({ length: 5 }, () => entry({ attempted: 22, correct: 22, totalMarks: 66 }));
    const recent = entry({ attempted: 2, correct: 0, totalMarks: -2 });
    const leak = aggregateScoreLeak([...stale, recent], 1);

    expect(leak.bySection.Quant.mocks).toBe(1);
    expect(leak.bySection.Quant.perMock.unattemptedCost).toBe(60); // only the recent mock counts
  });

  it("reports nothing rather than guessing when counts are missing", () => {
    const leak = aggregateScoreLeak([entry({ attempted: null, correct: null })], 5);
    expect(leak.sectionsWithData).toEqual([]);
    expect(leak.biggestLeak).toBeNull();
  });
});
