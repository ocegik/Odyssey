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
