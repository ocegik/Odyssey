import { supabase } from "./supabaseClient";
import { normalizeMockDataset } from "./mockModel";

const TABLE = "app_storage";

/**
 * Generic key/value cloud persistence backing the app's localStorage-mirrored
 * hooks. Every consumer stores its whole slice of state as one JSON blob
 * under a fixed key ("entries", "settings", ...), same shape as what used to
 * live directly in localStorage.
 */
export async function fetchRemoteValue(key) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error(`Supabase fetch failed for "${key}":`, error.message);
    return null;
  }
  return data ? data.value : null;
}

export async function saveRemoteValue(key, value) {
  // No Supabase configured (e.g. local dev without .env) — nothing to report,
  // this is an intentional offline mode, not a failed sync.
  if (!supabase) return true;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error(`Supabase save failed for "${key}":`, error.message);
    return false;
  }
  return true;
}

/**
 * Settings now live in public.settings, one row per user, RLS-scoped to
 * auth.uid(). No key/table param needed — Postgres + RLS decide "whose row"
 * based on the logged-in session, not anything the client claims.
 */
export async function fetchRemoteSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("settings")
    .select("overall_target_marks, overall_target_percentile, section_target_marks, mock_schedule, layout_width, preferences")
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch failed for settings:", error.message);
    return null;
  }
  if (!data) return null;

  // Reshape DB columns back into the flat blob shape the app already expects,
  // so normalize()/the rest of the hook stack needs zero changes.
  return {
    overallTargetMarks: data.overall_target_marks,
    overallTargetPercentile: data.overall_target_percentile,
    sectionTargetMarks: data.section_target_marks,
    mockSchedule: data.mock_schedule,
    layoutWidth: data.layout_width,
    ...data.preferences,
  };
}

export async function saveRemoteSettings(value) {
  if (!supabase) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false; // not logged in — nothing to save against

  const {
    overallTargetMarks, overallTargetPercentile, sectionTargetMarks,
    mockSchedule, layoutWidth, catTargetDate, ...preferences
  } = value;

  const { error } = await supabase.from("settings").upsert({
    user_id: user.id,
    overall_target_marks: overallTargetMarks ?? null,
    overall_target_percentile: overallTargetPercentile ?? null,
    section_target_marks: sectionTargetMarks ?? {},
    mock_schedule: mockSchedule ?? [],
    layout_width: layoutWidth ?? "comfortable",
    preferences,
  });

  if (error) {
    console.error("Supabase save failed for settings:", error.message);
    return false;
  }
  return true;
}

function syllabusStatus(progress) {
  if (progress?.completionStatus === "completed" || progress?.completionStatus === "in_progress") {
    return progress.completionStatus;
  }
  return progress?.completed ? "completed" : "not_started";
}

function jsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function timestampToMilliseconds(value) {
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : undefined;
}

function timestampForDatabase(value) {
  const milliseconds = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : undefined;
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

/**
 * Converts the normalized, one-row-per-topic syllabus data back into the
 * learning-state shape consumed by useSyllabus. View-only fields (filters and
 * expanded state) deliberately remain local; they have no syllabus column.
 */
export function syllabusRowsToLearningState(rows) {
  const progress = {};
  const revisionEvents = [];

  (rows || []).forEach((row) => {
    if (!row?.topic_id) return;

    const completionStatus = ["not_started", "in_progress", "completed"].includes(row.completion_status)
      ? row.completion_status
      : "not_started";
    const metrics = jsonObject(row.metrics);

    progress[row.topic_id] = {
      completed: completionStatus === "completed",
      completionStatus,
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
      notes: typeof row.notes === "string" ? row.notes : "",
      resources: Array.isArray(row.resources) ? row.resources : [],
      ...(Object.keys(metrics).length > 0 ? { legacyMetrics: metrics } : {}),
    };

    if (Array.isArray(row.revision_history)) revisionEvents.push(...row.revision_history);
  });

  return { progress, revisionEvents };
}

/**
 * Splits the app's flat learning-state blob into the rows owned by a single
 * user. Revision events are grouped by their topic so no topic needs a blob
 * row merely to carry its history.
 */
export function learningStateToSyllabusRows(value, userId) {
  const state = jsonObject(value);
  const progress = jsonObject(state.progress);
  const revisionEventsByTopic = new Map();

  (Array.isArray(state.revisionEvents) ? state.revisionEvents : []).forEach((event) => {
    if (!event || typeof event !== "object" || typeof event.topicId !== "string" || !event.topicId) return;
    const events = revisionEventsByTopic.get(event.topicId) || [];
    events.push(event);
    revisionEventsByTopic.set(event.topicId, events);
  });

  const topicIds = new Set([...Object.keys(progress), ...revisionEventsByTopic.keys()]);
  return [...topicIds].map((topicId) => {
    const topicProgress = jsonObject(progress[topicId]);
    return {
      user_id: userId,
      topic_id: topicId,
      completion_status: syllabusStatus(topicProgress),
      completed_at: typeof topicProgress.completedAt === "string" ? topicProgress.completedAt : null,
      notes: typeof topicProgress.notes === "string" ? topicProgress.notes : "",
      resources: Array.isArray(topicProgress.resources) ? topicProgress.resources : [],
      revision_history: revisionEventsByTopic.get(topicId) || [],
      metrics: jsonObject(topicProgress.legacyMetrics),
    };
  });
}

/**
 * Syllabus is normalized into one RLS-scoped row per (user_id, topic_id),
 * unlike app_storage's single JSON blob. These adapters preserve the app's
 * existing learning-state contract on either side of that representation.
 */
export async function fetchRemoteSyllabus() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("syllabus")
    .select("topic_id, completion_status, completed_at, notes, resources, revision_history, metrics");

  if (error) {
    console.error("Supabase fetch failed for syllabus:", error.message);
    return null;
  }
  return data?.length ? syllabusRowsToLearningState(data) : null;
}

export async function saveRemoteSyllabus(value) {
  if (!supabase) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false; // not logged in — nothing to save against

  const rows = learningStateToSyllabusRows(value, user.id);
  if (!rows.length) return true;

  const { error } = await supabase
    .from("syllabus")
    .upsert(rows, { onConflict: "user_id,topic_id" });

  if (error) {
    console.error("Supabase save failed for syllabus:", error.message);
    return false;
  }
  return true;
}

function sectionRowToRaw(section, mockId) {
  const createdAt = timestampToMilliseconds(section.created_at);
  return {
    id: section.id,
    mockId,
    ...(createdAt !== undefined ? { createdAt } : {}),
    section: section.section_name,
    attempted: numberOrNull(section.attempted),
    correct: numberOrNull(section.correct),
    totalQuestions: numberOrNull(section.total_questions) ?? 0,
    percentile: numberOrNull(section.percentile),
    manualTotalMarks: numberOrNull(section.manual_total_marks),
    questionSetCount: numberOrNull(section.question_set_count),
    questionBlocks: Array.isArray(section.question_blocks) ? section.question_blocks : [],
    notes: typeof section.notes === "string" ? section.notes : "",
  };
}

/**
 * Reshapes a detailed-analysis row into the document shape used by the app.
 * The typed columns keep the fields we may query later easy to access, while
 * the question/block tree stays together in `document` for now.
 */
export function analysisRowToDetailedAnalysis(row) {
  if (!row || typeof row !== "object") return null;

  const document = jsonObject(row.document);
  const createdAt = timestampToMilliseconds(row.created_at);
  const updatedAt = timestampToMilliseconds(row.updated_at);

  return {
    id: row.id,
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    schemaVersion: numberOrNull(row.schema_version) ?? 3,
    sourceFormat: stringOrEmpty(row.source_format) || "detailed-analysis-json",
    mockName: stringOrEmpty(document.mockName),
    date: stringOrEmpty(document.date),
    overallReflection: stringOrEmpty(row.overall_reflection),
    structureText: stringOrEmpty(row.structure_text),
    insightDimensions: Array.isArray(document.insightDimensions) ? document.insightDimensions : [],
    sections: jsonObject(document.sections),
    summary: jsonObject(row.summary),
  };
}

/**
 * Reshapes the app's existing analysis document into its single linked DB row.
 * `mock_id` is the database parent ID; the app's legacy mock ID remains only
 * on the parent row and never crosses this relationship boundary.
 */
export function detailedAnalysisToRow(analysis, databaseMockId, userId) {
  const createdAt = timestampForDatabase(analysis.createdAt);
  return {
    user_id: userId,
    mock_id: databaseMockId,
    schema_version: numberOrNull(analysis.schemaVersion) ?? 3,
    source_format: stringOrEmpty(analysis.sourceFormat) || "detailed-analysis-json",
    overall_reflection: stringOrEmpty(analysis.overallReflection),
    structure_text: stringOrEmpty(analysis.structureText),
    document: {
      mockName: stringOrEmpty(analysis.mockName),
      date: stringOrEmpty(analysis.date),
      insightDimensions: Array.isArray(analysis.insightDimensions) ? analysis.insightDimensions : [],
      sections: jsonObject(analysis.sections),
    },
    summary: jsonObject(analysis.summary),
    ...(createdAt ? { created_at: createdAt } : {}),
  };
}

/**
 * Reassembles normalized mock, section, and optional analysis records into
 * the versioned blob useMockEntries already stores locally.
 */
export function mockRowsToDataset(rows) {
  return {
    version: 3,
    mocks: (rows || []).map((row) => {
      const id = row.legacy_mock_id || row.id;
      const createdAt = timestampToMilliseconds(row.created_at);
      const sections = Array.isArray(row.sections) ? row.sections : [];
      // PostgREST represents the child relationship as an array even though
      // the database unique constraint guarantees at most one row per mock.
      const analysisRow = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis;

      return {
        id,
        ...(createdAt !== undefined ? { createdAt } : {}),
        date: row.mock_date,
        source: row.source,
        manualTotalMarks: numberOrNull(row.manual_total_marks),
        overallPercentile: numberOrNull(row.overall_percentile),
        analysis: analysisRowToDetailedAnalysis(analysisRow),
        sections: sections.reduce((result, section) => {
          if (section?.section_name) result[section.section_name] = sectionRowToRaw(section, id);
          return result;
        }, {}),
      };
    }),
  };
}

function mockToParentRow(mock, userId) {
  const createdAt = timestampForDatabase(mock.createdAt);
  return {
    user_id: userId,
    legacy_mock_id: mock.id,
    mock_date: mock.date,
    source: mock.source,
    manual_total_marks: numberOrNull(mock.manualTotalMarks),
    overall_percentile: numberOrNull(mock.overallPercentile),
    ...(createdAt ? { created_at: createdAt } : {}),
  };
}

function mockToSectionRows(mock, databaseMockId, userId) {
  return Object.values(mock.sections || {}).map((section) => {
    const createdAt = timestampForDatabase(section.createdAt);
    return {
      user_id: userId,
      mock_id: databaseMockId,
      section_name: section.section,
      attempted: numberOrNull(section.attempted),
      correct: numberOrNull(section.correct),
      total_questions: numberOrNull(section.totalQuestions) ?? 0,
      percentile: numberOrNull(section.percentile),
      manual_total_marks: numberOrNull(section.manualTotalMarks),
      question_set_count: numberOrNull(section.questionSetCount),
      question_blocks: Array.isArray(section.questionBlocks) ? section.questionBlocks : [],
      notes: typeof section.notes === "string" ? section.notes : "",
      ...(createdAt ? { created_at: createdAt } : {}),
    };
  });
}

/**
 * Mocks are a parent row with up to three child section rows. The app keeps
 * using its existing versioned mock blob above this layer; only this adapter
 * knows about the normalized database representation.
 */
export async function fetchRemoteMocks() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mocks")
    .select("id, legacy_mock_id, mock_date, source, manual_total_marks, overall_percentile, created_at, sections(id, section_name, attempted, correct, total_questions, percentile, manual_total_marks, question_set_count, question_blocks, notes, created_at), analysis(id, schema_version, source_format, overall_reflection, structure_text, document, summary, created_at, updated_at)")
    .order("mock_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase fetch failed for mocks:", error.message);
    return null;
  }
  return data?.length ? mockRowsToDataset(data) : null;
}

export async function saveRemoteMocks(value) {
  if (!supabase) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  let mocks;
  try {
    mocks = normalizeMockDataset(value);
  } catch (error) {
    console.error("Could not normalize mocks for Supabase save:", error.message);
    return false;
  }

  // Fetching only the IDs lets a whole-dataset replacement and a one-item
  // delete remove stale parents. The database FK handles their sections.
  const { data: existingMocks, error: existingError } = await supabase
    .from("mocks")
    .select("id, legacy_mock_id");
  if (existingError) {
    console.error("Supabase fetch failed before saving mocks:", existingError.message);
    return false;
  }

  for (const mock of mocks) {
    const { data: parent, error: parentError } = await supabase
      .from("mocks")
      .upsert(mockToParentRow(mock, user.id), { onConflict: "user_id,legacy_mock_id" })
      .select("id")
      .single();
    if (parentError || !parent) {
      console.error("Supabase save failed for mock:", parentError?.message || "No parent row returned.");
      return false;
    }

    const sectionRows = mockToSectionRows(mock, parent.id, user.id);
    if (sectionRows.length) {
      const { error: sectionsError } = await supabase
        .from("sections")
        .upsert(sectionRows, { onConflict: "mock_id,section_name" });
      if (sectionsError) {
        console.error("Supabase save failed for mock sections:", sectionsError.message);
        return false;
      }
    }

    if (mock.analysis) {
      const { error: analysisError } = await supabase
        .from("analysis")
        .upsert(detailedAnalysisToRow(mock.analysis, parent.id, user.id), { onConflict: "mock_id" });
      if (analysisError) {
        console.error("Supabase save failed for mock analysis:", analysisError.message);
        return false;
      }
    } else {
      const { error: removedAnalysisError } = await supabase
        .from("analysis")
        .delete()
        .eq("mock_id", parent.id);
      if (removedAnalysisError) {
        console.error("Supabase cleanup failed for mock analysis:", removedAnalysisError.message);
        return false;
      }
    }

    const retainedNames = new Set(sectionRows.map((section) => section.section_name));
    const removedNames = ["VARC", "DILR", "Quant"].filter((name) => !retainedNames.has(name));
    if (removedNames.length) {
      const { error: removedSectionsError } = await supabase
        .from("sections")
        .delete()
        .eq("mock_id", parent.id)
        .in("section_name", removedNames);
      if (removedSectionsError) {
        console.error("Supabase cleanup failed for mock sections:", removedSectionsError.message);
        return false;
      }
    }
  }

  const retainedMockIds = new Set(mocks.map((mock) => mock.id));
  const removedParentIds = (existingMocks || [])
    .filter((mock) => mock.legacy_mock_id && !retainedMockIds.has(mock.legacy_mock_id))
    .map((mock) => mock.id);
  if (removedParentIds.length) {
    const { error: removedMocksError } = await supabase
      .from("mocks")
      .delete()
      .in("id", removedParentIds);
    if (removedMocksError) {
      console.error("Supabase delete failed for mocks:", removedMocksError.message);
      return false;
    }
  }

  return true;
}
