import { useCallback, useState } from "react";

const STORAGE_KEY = "cat-mock-tracker:disclosures";

/* One shared map for every collapsible section in the app, keyed by the
   section's stable id. Kept out of the Supabase-synced settings blob on
   purpose: which panels you like expanded is a per-device reading
   preference, not prep data worth syncing or restoring from a backup. */
function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Preference just won't stick — not worth surfacing.
  }
}

/**
 * Remembered open/closed state for one disclosure.
 *
 * The default only applies the first time: once someone opens an advanced
 * panel, it stays open on every future visit. That's the whole point — depth
 * is hidden by default but never re-hidden behind your back.
 */
export function useDisclosure(id, defaultOpen = false) {
  const [open, setOpen] = useState(() => {
    const stored = readMap()[id];
    return typeof stored === "boolean" ? stored : defaultOpen;
  });

  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;
      writeMap({ ...readMap(), [id]: next });
      return next;
    });
  }, [id]);

  return [open, toggle];
}
