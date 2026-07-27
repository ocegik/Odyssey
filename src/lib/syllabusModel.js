import { SYLLABUS_SECTIONS } from "./syllabusData";

/**
 * Builds the normalized syllabus tree once at module load: assigns
 * deterministic question-type ids, denormalizes parent references (every
 * micro topic knows its section/macro id and vice versa) and produces flat
 * lookup arrays so components don't need to walk the tree themselves.
 */
function buildSyllabusTree(sections) {
  const flatMicroTopics = [];
  const flatMacroTopics = [];
  const microTopicsByMacro = {};
  const macroTopicsBySection = {};

  const tree = sections.map((section) => {
    macroTopicsBySection[section.id] = [];

    const macroTopics = section.macroTopics.map((macro) => {
      microTopicsByMacro[macro.id] = [];

      const microTopics = macro.microTopics.map((micro) => {
        const questionTypes = micro.questionTypes.map((text, idx) => ({
          id: `${micro.id}-qt-${idx + 1}`,
          text,
        }));

        const normalizedMicro = {
          ...micro,
          questionTypes,
          sectionId: section.id,
          macroTopicId: macro.id,
        };

        flatMicroTopics.push(normalizedMicro);
        microTopicsByMacro[macro.id].push(normalizedMicro);
        return normalizedMicro;
      });

      const normalizedMacro = { ...macro, microTopics, sectionId: section.id };
      flatMacroTopics.push(normalizedMacro);
      macroTopicsBySection[section.id].push(normalizedMacro);
      return normalizedMacro;
    });

    return { ...section, macroTopics };
  });

  return { tree, flatMicroTopics, flatMacroTopics, microTopicsByMacro, macroTopicsBySection };
}

const built = buildSyllabusTree(SYLLABUS_SECTIONS);

export const SYLLABUS_TREE = built.tree;
export const ALL_MICRO_TOPICS = built.flatMicroTopics;
export const ALL_MACRO_TOPICS = built.flatMacroTopics;
export const MICRO_TOPICS_BY_MACRO = built.microTopicsByMacro;
export const MACRO_TOPICS_BY_SECTION = built.macroTopicsBySection;

export const TOTAL_MICRO_TOPIC_COUNT = ALL_MICRO_TOPICS.length;

/* ------------------------------------------------------------------ */
/*  Frequency                                                          */
/* ------------------------------------------------------------------ */

// Collapses the doc's five-value frequency scale (High / Medium-High /
// Medium / Low-Medium / Low) into the three buckets the filter UI exposes.
// A hyphenated value leans toward whichever end it's closer to in urgency
// terms, so "Medium-High" counts as High and "Low-Medium" counts as Low.
export function frequencyBucket(frequency) {
  if (!frequency) return null;
  if (frequency.includes("High")) return "High";
  if (frequency.includes("Low")) return "Low";
  return "Medium";
}

export const FREQUENCY_BUCKETS = ["High", "Medium", "Low"];

/* ------------------------------------------------------------------ */
/*  Progress / completion                                              */
/* ------------------------------------------------------------------ */

function emptyStats() {
  return { total: 0, completed: 0, percent: 0 };
}

function withPercent(stats) {
  return { ...stats, percent: stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100) };
}

/**
 * `progress` is the map of { [microTopicId]: { completed, ... } } owned by
 * useSyllabus. Returns overall / per-section / per-macro-topic completion
 * counts, all derived by simple micro-topic counting (not marks-weighted).
 */
export function computeSyllabusStats(progress) {
  const overall = emptyStats();
  const bySection = {};
  const byMacroTopic = {};

  SYLLABUS_TREE.forEach((section) => {
    bySection[section.id] = emptyStats();
  });
  ALL_MACRO_TOPICS.forEach((macro) => {
    byMacroTopic[macro.id] = emptyStats();
  });

  ALL_MICRO_TOPICS.forEach((micro) => {
    const isDone = Boolean(progress?.[micro.id]?.completed);
    overall.total += 1;
    bySection[micro.sectionId].total += 1;
    byMacroTopic[micro.macroTopicId].total += 1;
    if (isDone) {
      overall.completed += 1;
      bySection[micro.sectionId].completed += 1;
      byMacroTopic[micro.macroTopicId].completed += 1;
    }
  });

  Object.keys(bySection).forEach((id) => { bySection[id] = withPercent(bySection[id]); });
  Object.keys(byMacroTopic).forEach((id) => { byMacroTopic[id] = withPercent(byMacroTopic[id]); });

  return { overall: withPercent(overall), bySection, byMacroTopic };
}

const SECTION_BY_ID = Object.fromEntries(SYLLABUS_TREE.map((section) => [section.id, section]));

/**
 * Incomplete micro topics tagged "High" frequency, in syllabus order — the
 * topics most likely to show up in the exam that still need coverage.
 * Used by the Overview dashboard to surface what to study next.
 */
export function getHighFrequencyRemaining(progress, limit = 5) {
  return ALL_MICRO_TOPICS
    .filter((micro) => frequencyBucket(micro.frequency) === "High" && !progress?.[micro.id]?.completed)
    .slice(0, limit)
    .map((micro) => ({
      id: micro.id,
      name: micro.name,
      frequency: micro.frequency,
      sectionId: micro.sectionId,
      section: SECTION_BY_ID[micro.sectionId],
      macroTopicId: micro.macroTopicId,
    }));
}

/**
 * Macro topics ranked by lowest completion percent (untouched topics first,
 * ties broken by size so the biggest gaps surface). Fully completed and
 * empty macro topics are excluded. Takes already-computed stats so callers
 * that also need overall/bySection numbers don't run the tree walk twice.
 */
export function getLeastCompletedMacroTopics(stats, limit = 5) {
  return ALL_MACRO_TOPICS
    .map((macro) => ({
      id: macro.id,
      name: macro.name,
      sectionId: macro.sectionId,
      section: SECTION_BY_ID[macro.sectionId],
      ...stats.byMacroTopic[macro.id],
    }))
    .filter((macro) => macro.total > 0 && macro.percent < 100)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Search + filters                                                   */
/* ------------------------------------------------------------------ */

export const STATUS_FILTERS = ["all", "completed", "incomplete"];

function microTopicMatchesSearch(micro, macro, section, query) {
  if (!query) return true;
  const haystack = [
    section.name, section.fullName, macro.name, micro.name,
    ...micro.questionTypes.map((qt) => qt.text),
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function microTopicMatchesStatus(micro, progress, status) {
  if (status === "all") return true;
  const isDone = Boolean(progress?.[micro.id]?.completed);
  return status === "completed" ? isDone : !isDone;
}

function microTopicMatchesFrequency(micro, frequencyFilter) {
  if (frequencyFilter === "all") return true;
  return frequencyBucket(micro.frequency) === frequencyFilter;
}

/**
 * Filters the full tree down to sections/macro topics that still have at
 * least one matching micro topic, so collapsing/searching never leaves an
 * empty macro-topic shell visible. Returns a tree shaped like SYLLABUS_TREE
 * plus a flat `matchCount`.
 */
export function filterSyllabusTree(progress, { search = "", status = "all", frequency = "all" } = {}) {
  const query = search.trim().toLowerCase();
  let matchCount = 0;

  const tree = SYLLABUS_TREE.map((section) => {
    const macroTopics = section.macroTopics
      .map((macro) => {
        const microTopics = macro.microTopics.filter((micro) => (
          microTopicMatchesSearch(micro, macro, section, query)
          && microTopicMatchesStatus(micro, progress, status)
          && microTopicMatchesFrequency(micro, frequency)
        ));
        matchCount += microTopics.length;
        return { ...macro, microTopics };
      })
      .filter((macro) => macro.microTopics.length > 0);
    return { ...section, macroTopics };
  }).filter((section) => section.macroTopics.length > 0);

  return { tree, matchCount };
}
