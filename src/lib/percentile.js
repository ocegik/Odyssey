import { SECTIONS } from "../constants";

/**
 * A mock's overall percentile.
 *
 * Percentiles are ranks, not quantities — averaging three sectional
 * percentiles does NOT give the overall percentile a mock report would show
 * (the overall rank depends on the whole cohort's combined scores, not on
 * each section's rank). The average is still a useful stand-in when nothing
 * better was logged, but callers must be able to tell the two apart, because
 * this number drives the College-targets comparison.
 *
 * Returns null when there's nothing to go on, otherwise:
 *   { value, estimated, sectionsUsed, sectionsAvailable }
 * where `estimated: false` means it came from a real reported overall
 * percentile on the mock's analysis.
 */
export function mockOverallPercentile(mock) {
  if (!mock) return null;

  const reported = mock.analysis?.overallPercentile;
  if (Number.isFinite(reported)) {
    return { value: reported, estimated: false, sectionsUsed: 0, sectionsAvailable: SECTIONS.length };
  }

  const sectionPercentiles = SECTIONS
    .map((section) => mock[section]?.percentile)
    .filter((value) => Number.isFinite(value));

  if (sectionPercentiles.length === 0) return null;

  return {
    value: sectionPercentiles.reduce((sum, value) => sum + value, 0) / sectionPercentiles.length,
    estimated: true,
    sectionsUsed: sectionPercentiles.length,
    sectionsAvailable: SECTIONS.length,
  };
}

/**
 * Your most recent *known* percentile, walking back from the newest mock.
 *
 * Percentile is optional per mock, so keying off the latest mock alone made
 * the whole college comparison vanish the moment one mock was logged without
 * it — even with a dozen percentiles already on record. Returns the result
 * plus how far back it came from, so the UI can say "as of 3 mocks ago"
 * rather than implying it's current.
 */
export function latestKnownPercentile(mocks) {
  for (let i = mocks.length - 1; i >= 0; i -= 1) {
    const percentile = mockOverallPercentile(mocks[i]);
    if (percentile) return { ...percentile, mock: mocks[i], mocksAgo: mocks.length - 1 - i };
  }
  return null;
}

/** Short caveat for wherever an estimated percentile is displayed. */
export function percentileCaveat(percentile) {
  if (!percentile || !percentile.estimated) return null;
  return percentile.sectionsUsed < percentile.sectionsAvailable
    ? `Estimated — averaged from ${percentile.sectionsUsed} of ${percentile.sectionsAvailable} sectional percentiles`
    : "Estimated — averaged from sectional percentiles, not a reported overall percentile";
}

/**
 * Percentile-over-time series for the trend chart: one row per mock, with
 * each section's logged percentile plus the overall (reported or estimated).
 * Mocks with no percentile anywhere are dropped rather than rendered as an
 * empty column.
 */
export function buildPercentileSeries(mocks) {
  return mocks
    .map((mock) => {
      const overall = mockOverallPercentile(mock);
      const row = {
        label: mock.label,
        Overall: overall ? +overall.value.toFixed(2) : null,
        overallEstimated: overall ? overall.estimated : false,
      };
      SECTIONS.forEach((section) => {
        const value = mock[section]?.percentile;
        row[section] = Number.isFinite(value) ? value : null;
      });
      return row;
    })
    .filter((row) => row.Overall !== null || SECTIONS.some((section) => row[section] !== null));
}
