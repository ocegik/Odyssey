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
 * Browser storage is shared by every account that uses this browser. Keep the
 * fast local cache account-scoped so a second sign-in can never bootstrap
 * from, or overwrite, the previous person's data while its cloud data loads.
 */
export function accountStorageKey(storageKey, userId) {
  return userId ? `${storageKey}:account:${userId}` : null;
}

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
export function useCloudSyncedState({
  storageKey,
  remoteKey,
  load,
  empty,
  normalize,
  serialize = (v) => v,
  fetchRemote = fetchRemoteValue,
  saveRemote = saveRemoteValue,
  saveInitialState = true,
  userId = null,
}) {
  const scopedStorageKey = accountStorageKey(storageKey, userId);
  const [state, setState] = useState(() => (
    scopedStorageKey ? load(scopedStorageKey) : normalize(empty())
  ));
  // `stateOwnerId` makes the account boundary synchronous at render time. An
  // effect is too late here: it would allow the previous account's stats to
  // flash while React waits to reconcile the next account's cloud request.
  const [stateOwnerId, setStateOwnerId] = useState(userId ?? null);
  const [status, setStatus] = useState(supabase && userId ? SYNC_STATUS.loading : SYNC_STATUS.local);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // State, not a ref: flipping it has to re-run the push effect below, which
  // is what pushes a local-only dataset up on the very first sync.
  const [remoteReady, setRemoteReady] = useState(false);
  const dirtyBeforeReconcile = useRef(false);
  const saveTimer = useRef(null);
  const activeUserId = useRef(userId ?? null);
  activeUserId.current = userId ?? null;

  const clearState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    dirtyBeforeReconcile.current = false;
    setRemoteReady(false);
    setLastSyncedAt(null);
    setStatus(SYNC_STATUS.local);
    setStateOwnerId(userId ?? null);
    setState(normalize(empty()));
    try {
      if (scopedStorageKey) localStorage.removeItem(scopedStorageKey);
    } catch {
      // The in-memory state has still been cleared if browser storage is unavailable.
    }
  }, [empty, normalize, scopedStorageKey, userId]);

  // Change the in-memory cache as soon as the account changes. This also
  // cancels a pending save made for the prior account before it can execute
  // under the new Supabase session.
  useEffect(() => {
    const nextOwnerId = userId ?? null;
    if (stateOwnerId === nextOwnerId) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    dirtyBeforeReconcile.current = false;
    setRemoteReady(false);
    setLastSyncedAt(null);
    setStateOwnerId(nextOwnerId);
    setState(scopedStorageKey ? load(scopedStorageKey) : normalize(empty()));
  }, [empty, load, normalize, scopedStorageKey, stateOwnerId, userId]);

  // Local cache write — synchronous and never blocks the UI.
  useEffect(() => {
    if (!scopedStorageKey || !userId || stateOwnerId !== userId) return;
    try {
      localStorage.setItem(scopedStorageKey, JSON.stringify(serialize(state)));
    } catch {
      // Quota exceeded / private mode. The cloud copy (if any) is the durable
      // one anyway, so there's nothing to recover here.
    }
    // serialize is a stable module-level fn in every caller; re-running this
    // on a new function identity would just rewrite the same value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedStorageKey, state, stateOwnerId, userId]);

  /**
   * Marks state as user-edited. Every mutation goes through here so the
   * reconcile below can tell "the user has been typing" from "nothing has
   * happened yet".
   */
  const setSyncedState = useCallback((updater) => {
    // Ignore interactions during an account transition. The user only sees an
    // empty/loading dashboard until this hook has adopted the new account.
    if (!userId || stateOwnerId !== userId) return;
    dirtyBeforeReconcile.current = true;
    setState(updater);
  }, [stateOwnerId, userId]);

  // First-load reconcile: remote wins, unless local was edited while waiting.
  useEffect(() => {
    if (!supabase || !userId) {
      setRemoteReady(false);
      setStatus(SYNC_STATUS.local);
      return undefined;
    }
    let cancelled = false;
    const requestUserId = userId;

    setRemoteReady(false);
    setStatus(SYNC_STATUS.loading);

    fetchRemote(remoteKey)
      .then((remote) => {
        if (cancelled || activeUserId.current !== requestUserId) return;
        if (remote && !dirtyBeforeReconcile.current) {
          setState(normalize(remote));
          setStateOwnerId(requestUserId);
        }
        setRemoteReady(true);
        setStatus(SYNC_STATUS.synced);
        setLastSyncedAt(Date.now());
      })
      .catch(() => {
        if (cancelled || activeUserId.current !== requestUserId) return;
        // Still allow saves — a failed read shouldn't strand local edits offline.
        setRemoteReady(true);
        setStatus(SYNC_STATUS.error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRemote, remoteKey, userId]);

  // Debounced push, coalescing rapid edits (typing) into one write.
  useEffect(() => {
    if (!supabase || !userId || stateOwnerId !== userId || !remoteReady) return undefined;
    // Normalized tables can be wired before legacy app_storage is migrated.
    // In that case the caller can wait for a real user mutation rather than
    // treating its local cache as an implicit migration on first load.
    if (!saveInitialState && !dirtyBeforeReconcile.current) return undefined;

    setStatus(SYNC_STATUS.saving);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const requestUserId = userId;
    saveTimer.current = setTimeout(() => {
      saveRemote(remoteKey, serialize(state)).then((ok) => {
        if (activeUserId.current !== requestUserId) return;
        setStatus(ok ? SYNC_STATUS.synced : SYNC_STATUS.error);
        if (ok) setLastSyncedAt(Date.now());
      });
    }, REMOTE_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stateOwnerId, remoteKey, remoteReady, saveRemote, userId]);

  /* `setState` (raw) is exposed for replacing state from a source that isn't
     a user edit in this tab — currently unused, but kept distinct so the
     dirty-tracking above stays meaningful. */
  return {
    // Never hand a previous account's value to callers, even for the single
    // render between an auth transition and the effects above.
    state: userId && stateOwnerId === userId ? state : normalize(empty()),
    setState: setSyncedState,
    clearState,
    status,
    lastSyncedAt,
  };
}
