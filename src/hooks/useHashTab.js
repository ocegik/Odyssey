import { useCallback, useEffect, useState } from "react";
import { TABS } from "../constants";

// Quick Math deliberately has no navigation-tab entry: Overview is its
// launcher, while this route remains directly addressable and keeps the full
// focused practice experience out of the dashboard nav.
const VALID_TABS = [...TABS.map((tab) => tab.key), "quickMath"];
const LEGACY_TAB_ALIASES = {
  settings: "account",
  profile: "account",
};

function tabFromHash(fallback) {
  const key = window.location.hash.replace(/^#\/?/, "");
  const resolvedKey = LEGACY_TAB_ALIASES[key] || key;
  return VALID_TABS.includes(resolvedKey) ? resolvedKey : fallback;
}

/**
 * Keeps the active tab in the URL hash (`#/trends`).
 *
 * Before this, reloading always dumped you back on Overview and there was no
 * way to link to a specific view — a real annoyance on a dashboard you check
 * repeatedly. The hash (rather than a path) keeps the app a static site with
 * no server rewrite rules, which is the deployment constraint in the README.
 */
export function useHashTab(defaultTab) {
  const [activeTab, setActiveTab] = useState(() => tabFromHash(defaultTab));

  // Back/forward and hand-edited URLs.
  useEffect(() => {
    const onHashChange = () => {
      const tab = tabFromHash(defaultTab);
      setActiveTab(tab);
      if (window.location.hash !== `#/${tab}`) {
        window.history.replaceState(null, "", `#/${tab}`);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultTab]);

  // Normalize legacy, empty, and bogus hashes so bookmarks to the consolidated
  // account area continue to work without leaving a stale route in the URL.
  useEffect(() => {
    if (window.location.hash !== `#/${activeTab}`) {
      window.history.replaceState(null, "", `#/${activeTab}`);
    }
  }, [activeTab]);

  const changeTab = useCallback((key) => {
    if (!VALID_TABS.includes(key)) return;
    setActiveTab(key);
    // pushState (not replaceState) so the browser Back button walks tabs.
    if (window.location.hash !== `#/${key}`) {
      window.history.pushState(null, "", `#/${key}`);
    }
  }, []);

  return [activeTab, changeTab];
}
