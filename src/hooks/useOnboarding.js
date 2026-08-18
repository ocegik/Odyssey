import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ACCOUNT_TYPES = ["community", "personal"];

function normalizeAccountType(value) {
  return ACCOUNT_TYPES.includes(value) ? value : "community";
}

const initialState = (userId) => {
  if (!userId) return { status: "idle", completed: false, profile: null, error: "" };
  if (!supabase) return { status: "unavailable", completed: true, profile: null, error: "" };
  return { status: "loading", completed: false, profile: null, error: "" };
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
      setState({ status: "idle", completed: false, profile: null, error: "" });
      return undefined;
    }
    if (!supabase) {
      setState({ status: "unavailable", completed: true, profile: null, error: "" });
      return undefined;
    }

    setState({ status: "loading", completed: false, profile: null, error: "" });
    supabase
      .from("profiles")
      .select("onboarding_completed, display_name, username, age, cat_target_year, account_type")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load onboarding status:", error.message);
          // Do not lock an established user out of the dashboard if a profile
          // migration has not yet been applied. New deployments include it.
          setState({ status: "error", completed: true, profile: null, error: error.message });
          return;
        }
        setState({
          status: "ready",
          completed: data?.onboarding_completed === true,
          profile: data ?? null,
          error: "",
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const complete = useCallback(async ({ displayName, username, age, catTargetYear, accountType }) => {
    if (!userId || !supabase) return;

    const normalizedName = typeof displayName === "string" ? displayName.trim() : "";
    const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    const normalizedAge = Number(age);
    const targetYear = Number(catTargetYear);
    const normalizedAccountType = normalizeAccountType(accountType);
    if (!normalizedName) throw new Error("Please enter your name.");
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      throw new Error("Username must be 3–24 letters, numbers, or underscores.");
    }
    if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100) {
      throw new Error("Please choose your CAT target year.");
    }
    if (!Number.isInteger(normalizedAge) || normalizedAge < 1 || normalizedAge > 120) {
      throw new Error("Please enter an age between 1 and 120.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: normalizedName,
        username: normalizedUsername,
        age: normalizedAge,
        cat_target_year: targetYear,
        account_type: normalizedAccountType,
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (error) {
      if (error.code === "23505") throw new Error("That username is already taken. Try another one.");
      throw error;
    }
    setState({
      status: "ready",
      completed: true,
      profile: {
        onboarding_completed: true,
        display_name: normalizedName,
        username: normalizedUsername,
        age: normalizedAge,
        cat_target_year: targetYear,
        account_type: normalizedAccountType,
      },
      error: "",
    });
  }, [userId]);

  const updateAccountType = useCallback(async (accountType) => {
    if (!userId || !supabase) return;
    if (!ACCOUNT_TYPES.includes(accountType)) throw new Error("Please choose Community or Personal.");

    const { error } = await supabase
      .from("profiles")
      .update({ account_type: accountType })
      .eq("id", userId);
    if (error) throw error;

    setState((current) => ({
      ...current,
      profile: { ...(current.profile || {}), account_type: accountType },
    }));
  }, [userId]);

  return { ...state, complete, updateAccountType };
}
