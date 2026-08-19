import { useCallback, useEffect, useState } from "react";
import { TABS } from "../constants";

// Quick Math deliberately has no navigation-tab entry: Overview is its
// launcher, while this route remains directly addressable and keeps the full
// focused practice experience out of the dashboard nav.
const VALID_TABS = [...TABS.map((tab) => tab.key), "quickMath", "privacy", "terms"];
const LEGACY_TAB_ALIASES = {
  settings: "account",
  profile: "account",
  log: "mocks",
  analysis: "mocks",
};

function safelyDecode(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseHashRoute(hash, fallback) {
  const rawRoute = String(hash || "").replace(/^#\/?/, "");
  const [path = "", query = ""] = rawRoute.split("?", 2);
  const [rawTab, rawMockId] = path.split("/").filter(Boolean);
  const tab = LEGACY_TAB_ALIASES[rawTab] || rawTab;

  if (!VALID_TABS.includes(tab)) return { tab: fallback, mockId: null };

  const queryParams = new URLSearchParams(query);
  const queryMockId = queryParams.get("mock") || queryParams.get("mockId");
  return {
    tab,
    // Older shared analysis links may have put the ID in a query string;
    // new links use a compact path segment (#/mocks/<id>).
    mockId: queryMockId || safelyDecode(rawMockId) || null,
  };
}

function hashForRoute({ tab, mockId }) {
  return `#/${tab}${mockId ? `/${encodeURIComponent(mockId)}` : ""}`;
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
  const [route, setRoute] = useState(() =>
    parseHashRoute(window.location.hash, defaultTab),
  );

  // Back/forward and hand-edited URLs.
  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = parseHashRoute(window.location.hash, defaultTab);
      setRoute(nextRoute);
      const normalizedHash = hashForRoute(nextRoute);
      if (window.location.hash !== normalizedHash) {
        window.history.replaceState(null, "", normalizedHash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultTab]);

  // Normalize legacy, empty, and bogus hashes so bookmarks continue to point
  // at a live tab. In particular, #/analysis now lands on #/mocks.
  useEffect(() => {
    const normalizedHash = hashForRoute(route);
    if (window.location.hash !== normalizedHash) {
      window.history.replaceState(null, "", normalizedHash);
    }
  }, [route]);

  const changeTab = useCallback((key, { mockId = null } = {}) => {
    if (!VALID_TABS.includes(key)) return;
    const nextRoute = { tab: key, mockId };
    setRoute(nextRoute);
    // pushState (not replaceState) so the browser Back button walks tabs.
    const nextHash = hashForRoute(nextRoute);
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  }, []);

  return [route.tab, changeTab, route.mockId];
}
