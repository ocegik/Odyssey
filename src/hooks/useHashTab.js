import { useCallback, useEffect, useState } from "react";
import { TABS } from "../constants";

const VALID_TABS = TABS.map((tab) => tab.key);

function tabFromHash(fallback) {
  const key = window.location.hash.replace(/^#\/?/, "");
  return VALID_TABS.includes(key) ? key : fallback;
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
    const onHashChange = () => setActiveTab(tabFromHash(defaultTab));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultTab]);

  // Normalize the bar on first load: an empty or bogus hash gets rewritten to
  // whatever tab actually rendered, so the URL is never lying about the view.
  useEffect(() => {
    if (window.location.hash !== `#/${activeTab}`) {
      window.history.replaceState(null, "", `#/${activeTab}`);
    }
    // Intentionally first-mount only — subsequent changes go through changeTab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
