/* Small counting/aggregation helpers shared by the insight generators in
   perMockInsights.js, detailedAnalysisInsights.js, advancedInsights.js,
   compute.js, and AnalysisInsightsDataTab.jsx — previously copy-pasted
   into each of those independently. */

export function inc(counter, key, by = 1) {
  const safeKey = key || "Unspecified";
  counter[safeKey] = (counter[safeKey] || 0) + by;
}

export function topEntry(counter) {
  const entries = Object.entries(counter || {}).sort((a, b) => b[1] - a[1]);
  return entries[0] ? { label: entries[0][0], count: entries[0][1] } : null;
}

export function topEntries(counter, limit = 4) {
  return Object.entries(counter || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function avg(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/* The one "accuracy = correct/attempted" implementation, shared by both the
   Mock Log path (compute.js) and every Analysis-question-based path
   (analysisModel.js, detailedAnalysisInsights.js, advancedInsights.js) —
   those two sides read different inputs, but the arithmetic is identical. */
export function accuracyOf(correct, attempted) {
  if (correct === null || correct === undefined || !attempted) return null;
  return correct / attempted;
}

export function stdDev(values) {
  if (values.length < 2) return null;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((v) => (v - mean) ** 2)));
}
