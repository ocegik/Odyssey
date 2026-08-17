import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Reads the role from the profile row protected by RLS. This is only a UI
 * guard: the matching database policies are the authorization boundary.
 */
export function useAdminRole(userId) {
  const [state, setState] = useState({ status: "idle", isAdmin: false, userId: null });

  useEffect(() => {
    let active = true;

    if (!userId || !supabase) {
      setState({ status: "ready", isAdmin: false, userId: userId ?? null });
      return undefined;
    }

    setState({ status: "loading", isAdmin: false, userId });
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load account role:", error.message);
          setState({ status: "error", isAdmin: false, userId });
          return;
        }
        setState({ status: "ready", isAdmin: data?.role === "admin", userId });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return state;
}
