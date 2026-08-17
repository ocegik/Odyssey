import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Reads the role from the profile row protected by RLS. This is only a UI
 * guard: the matching database policies are the authorization boundary.
 */
export function useAdminRole(userId) {
  const [state, setState] = useState({ status: "idle", isAdmin: false });

  useEffect(() => {
    let active = true;

    if (!userId || !supabase) {
      setState({ status: "ready", isAdmin: false });
      return undefined;
    }

    setState({ status: "loading", isAdmin: false });
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load account role:", error.message);
          setState({ status: "error", isAdmin: false });
          return;
        }
        setState({ status: "ready", isAdmin: data?.role === "admin" });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return state;
}
