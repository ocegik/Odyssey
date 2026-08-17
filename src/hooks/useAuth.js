import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const INITIAL_STATE = supabase
  ? { status: "loading", user: null }
  : { status: "unavailable", user: null };

/**
 * Authentication is deliberately independent from the legacy cloud-sync
 * hooks. Phase 1 establishes accounts only; it must not change where the
 * current app data reads or writes.
 */
export function useAuth() {
  const [authState, setAuthState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("Could not restore the signed-in session:", error.message);
        setAuthState({ status: "error", user: null });
        return;
      }
      setAuthState({ status: "ready", user: data.session?.user ?? null });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthState({ status: "ready", user: session?.user ?? null });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) throw new Error("Connect Supabase before signing in.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password }) => {
    if (!supabase) throw new Error("Connect Supabase before creating an account.");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return { ...authState, signIn, signUp, signOut };
}
