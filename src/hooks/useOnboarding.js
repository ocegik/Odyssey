import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const initialState = (userId) => {
  if (!userId) return { status: "idle", completed: false, error: "" };
  if (!supabase) return { status: "unavailable", completed: true, error: "" };
  return { status: "loading", completed: false, error: "" };
};

/**
 * Onboarding is profile data, rather than device-local state, so a completed
 * walkthrough never returns after a new browser session or device change.
 */
export function useOnboarding(userId) {
  const [state, setState] = useState(() => initialState(userId));

  useEffect(() => {
    let active = true;

    if (!userId) {
      setState({ status: "idle", completed: false, error: "" });
      return undefined;
    }
    if (!supabase) {
      setState({ status: "unavailable", completed: true, error: "" });
      return undefined;
    }

    setState({ status: "loading", completed: false, error: "" });
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load onboarding status:", error.message);
          // Do not lock an established user out of the dashboard if a profile
          // migration has not yet been applied. New deployments include it.
          setState({ status: "error", completed: true, error: error.message });
          return;
        }
        setState({ status: "ready", completed: data?.onboarding_completed === true, error: "" });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const complete = useCallback(async () => {
    if (!userId || !supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
    if (error) throw error;
    setState({ status: "ready", completed: true, error: "" });
  }, [userId]);

  return { ...state, complete };
}
