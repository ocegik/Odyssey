import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CURRENT_STATUS_OPTIONS, GENDER_OPTIONS, TEST_SERIES_OPTIONS } from "./useSettings";

const ACCOUNT_TYPES = ["community", "personal"];

function normalizeAccountType(value) {
  return ACCOUNT_TYPES.includes(value) ? value : "personal";
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
      .select("onboarding_completed, display_name, age, cat_target_year, account_type, gender, test_series")
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

  const complete = useCallback(async ({
    displayName, age, catTargetYear,
    preparationStartDate, testSeries, gender, currentStatus,
  }) => {
    if (!userId || !supabase) return;

    const normalizedName = typeof displayName === "string" ? displayName.trim() : "";
    const hasAge = age !== "" && age !== null && age !== undefined;
    const normalizedAge = hasAge ? Number(age) : null;
    const targetYear = Number(catTargetYear);
    const normalizedAccountType = "personal";
    if (!normalizedName) throw new Error("Please enter your name.");
    if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100) {
      throw new Error("Please choose your CAT target year.");
    }
    if (hasAge && (!Number.isInteger(normalizedAge) || normalizedAge < 1 || normalizedAge > 120)) {
      throw new Error("Please enter an age between 1 and 120.");
    }
    if (typeof preparationStartDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(preparationStartDate)) {
      throw new Error("Please enter the date you started preparing.");
    }
    if (currentStatus && !CURRENT_STATUS_OPTIONS.some((option) => option.value === currentStatus)) {
      throw new Error("Please choose a valid current status.");
    }
    if (gender && !GENDER_OPTIONS.some((option) => option.value === gender)) {
      throw new Error("Please choose a valid gender option.");
    }
    if (!Array.isArray(testSeries) || testSeries.some((series) => !TEST_SERIES_OPTIONS.includes(series))) {
      throw new Error("Please choose valid test series options.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: normalizedName,
        age: normalizedAge,
        cat_target_year: targetYear,
        account_type: normalizedAccountType,
        gender: gender || null,
        test_series: testSeries,
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (error) {
      throw error;
    }
    setState({
      status: "ready",
      completed: true,
      profile: {
        onboarding_completed: true,
        display_name: normalizedName,
        age: normalizedAge,
        cat_target_year: targetYear,
        account_type: normalizedAccountType,
        gender: gender || null,
        test_series: testSeries,
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

  const updatePersonalDetails = useCallback(async ({ gender, testSeries }) => {
    if (!userId || !supabase) return;

    const update = {};
    if (gender !== undefined) {
      if (gender && !GENDER_OPTIONS.some((option) => option.value === gender)) {
        throw new Error("Please choose a valid gender option.");
      }
      update.gender = gender || null;
    }
    if (testSeries !== undefined) {
      if (!Array.isArray(testSeries) || testSeries.some((series) => !TEST_SERIES_OPTIONS.includes(series))) {
        throw new Error("Please choose valid test series options.");
      }
      update.test_series = testSeries;
    }
    if (!Object.keys(update).length) return;

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", userId);
    if (error) throw error;

    setState((current) => ({
      ...current,
      profile: {
        ...(current.profile || {}),
        ...(update.gender !== undefined ? { gender: update.gender } : {}),
        ...(update.test_series !== undefined ? { test_series: update.test_series } : {}),
      },
    }));
  }, [userId]);

  return { ...state, complete, updateAccountType, updatePersonalDetails };
}
