const MAX_TOP_SIGNALS = 4;

/* Insights from three independent generators (section, set, topic) never
   collide on id (each is prefixed by its own generator), but can still
   restate the same section+theme in different words — dedupe on that pair
   so the merged list doesn't surface near-identical rows twice. */
function dedupeKey(insight) {
  return `${insight.section}::${insight.title || insight.text.slice(0, 40)}`;
}

/**
 * Merges the three independently-ranked insight feeds (section-level,
 * set-level, topic-level) into one globally-ranked "biggest problems" list.
 * Every source array is already sorted/capped by its own generator; this
 * only re-sorts the union by the shared `significance` score and dedupes.
 */
export function buildTopSignals(detailed, advanced, { limit = MAX_TOP_SIGNALS } = {}) {
  const pool = [...detailed.insights, ...advanced.setInsights, ...advanced.topicInsights].sort(
    (a, b) => b.significance - a.significance
  );

  const seen = new Set();
  const picked = [];
  for (const insight of pool) {
    const key = dedupeKey(insight);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(insight);
    if (picked.length >= limit) break;
  }
  return picked;
}
