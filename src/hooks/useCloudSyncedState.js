import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRemoteValue, saveRemoteValue } from "../lib/cloudStore";
import { supabase } from "../lib/supabaseClient";

const REMOTE_SAVE_DEBOUNCE_MS = 600;

export const SYNC_STATUS = {
  local: "local",      // no Supabase configured — this device only
  loading: "loading",  // first reconcile against the cloud in flight
  saving: "saving",
  synced: "synced",
  error: "error",
};

/**
 * State that mirrors to localStorage immediately and to Supabase on a debounce.
 *
 * Shared by the mocks / settings / syllabus hooks, which each used to carry
 * their own copy of this three-effect dance.
 *
 * The one behavioural rule worth knowing: the initial remote fetch only
 * replaces local state if the user hasn't already edited something while it
 * was in flight. Supabase can take seconds on a cold connection, and
 * unconditionally applying the response — as each hook used to — silently
 * threw away anything typed in the meantime.
 */
export function useCloudSyncedState({ storageKey, remoteKey, load, normalize, serialize = (v) => v }) {
  const [state, setState] = useState(load);
  const [status, setStatus] = useState(supabase ? SYNC_STATUS.loading : SYNC_STATUS.local);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // State, not a ref: flipping it has to re-run the push effect below, which
  // is what pushes a local-only dataset up on the very first sync.
  const [remoteReady, setRemoteReady] = useState(false);
  const dirtyBeforeReconcile = useRef(false);
  const saveTimer = useRef(null);

  // Local cache write — synchronous and never blocks the UI.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(serialize(state)));
    } catch {
      // Quota exceeded / private mode. The cloud copy (if any) is the durable
      // one anyway, so there's nothing to recover here.
    }
    // serialize is a stable module-level fn in every caller; re-running this
    // on a new function identity would just rewrite the same value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, storageKey]);

  /**
   * Marks state as user-edited. Every mutation goes through here so the
   * reconcile below can tell "the user has been typing" from "nothing has
   * happened yet".
   */
  const setSyncedState = useCallback((updater) => {
    dirtyBeforeReconcile.current = true;
    setState(updater);
  }, []);

  // First-load reconcile: remote wins, unless local was edited while waiting.
  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;

    fetchRemoteValue(remoteKey)
      .then((remote) => {
        if (cancelled) return;
        if (remote && !dirtyBeforeReconcile.current) {
          setState(normalize(remote));
        }
        setRemoteReady(true);
        setStatus(SYNC_STATUS.synced);
        setLastSyncedAt(Date.now());
      })
      .catch(() => {
        if (cancelled) return;
        // Still allow saves — a failed read shouldn't strand local edits offline.
        setRemoteReady(true);
        setStatus(SYNC_STATUS.error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteKey]);

  // Debounced push, coalescing rapid edits (typing) into one write.
  useEffect(() => {
    if (!supabase || !remoteReady) return undefined;

    setStatus(SYNC_STATUS.saving);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveRemoteValue(remoteKey, serialize(state)).then((ok) => {
        setStatus(ok ? SYNC_STATUS.synced : SYNC_STATUS.error);
        if (ok) setLastSyncedAt(Date.now());
      });
    }, REMOTE_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, remoteKey, remoteReady]);

  /* `setState` (raw) is exposed for replacing state from a source that isn't
     a user edit in this tab — currently unused, but kept distinct so the
     dirty-tracking above stays meaningful. */
  return { state, setState: setSyncedState, status, lastSyncedAt };
}
