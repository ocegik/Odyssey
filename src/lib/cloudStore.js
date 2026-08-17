import { supabase } from "./supabaseClient";

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
    mockSchedule, layoutWidth, ...preferences
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
