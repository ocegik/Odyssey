import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getOAuthCallbackUrl } from "../lib/oauthRedirect";

const INITIAL_STATE = supabase
  ? { status: "loading", user: null }
  : { status: "unavailable", user: null };

/**
 * Authentication owns the active account. The normalized storage hooks use
 * that account ID as their query boundary, while App clears their local and
 * in-memory state whenever the account changes or signs out.
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

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Connect Supabase before signing in.");

    // Supabase's default implicit flow returns its session in the URL fragment.
    // This app's routes also use the fragment, so putting `#/overview` here
    // makes the session parameters unparsable. Return to the bare app first;
    // App redirects a confirmed session to Overview afterwards.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthCallbackUrl(window.location.origin),
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return { ...authState, signIn, signUp, signInWithGoogle, signOut };
}
