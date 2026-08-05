/**
 * A mock's reported overall percentile. Overall percentile is a cohort rank,
 * so it must be logged directly rather than derived from sectional ranks.
 */
export function mockOverallPercentile(mock) {
  if (!mock) return null;
  return Number.isFinite(mock.overallPercentile) ? { value: mock.overallPercentile } : null;
}

/**
 * Your most recent *known* percentile, walking back from the newest mock.
 *
 * Legacy mocks may predate overall percentile logging, so keying off the
 * latest mock alone would hide a still-useful prior result. Returns the
 * result plus how far back it came from, so the UI can say "as of 3 mocks
 * ago" rather than implying it's current.
 */
export function latestKnownPercentile(mocks) {
  for (let i = mocks.length - 1; i >= 0; i -= 1) {
    const percentile = mockOverallPercentile(mocks[i]);
    if (percentile) return { ...percentile, mock: mocks[i], mocksAgo: mocks.length - 1 - i };
  }
  return null;
}

/**
 * Percentile-over-time series for the trend chart: one row per mock, with
 * the reported overall percentile and each section's reported percentile.
 */
export function buildPercentileSeries(mocks) {
  return mocks
    .map((mock) => {
      const overall = mockOverallPercentile(mock);
      const row = {
        label: mock.label,
        Overall: overall ? +overall.value.toFixed(2) : null,
      };
      SECTIONS.forEach((section) => {
        const value = mock[section]?.percentile;
        row[section] = Number.isFinite(value) ? value : null;
      });
      return row;
    })
    .filter((row) => row.Overall !== null || SECTIONS.some((section) => row[section] !== null));
}
import { SECTIONS } from "../constants";
