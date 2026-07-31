import { Check, HardDrive, RefreshCw, TriangleAlert } from "lucide-react";
import { COLORS } from "../../constants";
import { SYNC_STATUS } from "../../hooks/useCloudSyncedState";

/* Rank matters: the badge shows the *worst* state across the three synced
   slices (mocks / settings / syllabus), so a failing mock sync is never
   hidden behind a settings slice that happened to save fine. */
const RANK = [SYNC_STATUS.error, SYNC_STATUS.loading, SYNC_STATUS.saving, SYNC_STATUS.local, SYNC_STATUS.synced];

const META = {
  [SYNC_STATUS.error]: { icon: TriangleAlert, label: "Sync failed", color: COLORS.danger, title: "Couldn't reach the cloud. Changes are saved on this device — export a backup from Settings to be safe." },
  [SYNC_STATUS.loading]: { icon: RefreshCw, label: "Syncing", color: COLORS.inkMuted, title: "Loading your data from the cloud." },
  [SYNC_STATUS.saving]: { icon: RefreshCw, label: "Saving", color: COLORS.inkMuted, title: "Saving changes to the cloud." },
  [SYNC_STATUS.local]: { icon: HardDrive, label: "This device", color: COLORS.inkMuted, title: "No cloud sync configured — data lives in this browser only. Export backups from Settings." },
  [SYNC_STATUS.synced]: { icon: Check, label: "Synced", color: COLORS.good, title: "All changes saved to the cloud." },
};

function worstStatus(statuses) {
  const present = statuses.filter(Boolean);
  if (present.length === 0) return SYNC_STATUS.local;
  return RANK.find((status) => present.includes(status)) ?? SYNC_STATUS.synced;
}

/**
 * Cloud sync used to be entirely invisible unless a mock save failed (and
 * settings/syllabus failures said nothing at all). On an app whose whole
 * value is months of accumulated data, "is this actually saved?" deserves a
 * permanent answer rather than a transient toast.
 */
export default function SyncBadge({ statuses = [] }) {
  const status = worstStatus(statuses);
  const { icon: Icon, label, color, title } = META[status] ?? META[SYNC_STATUS.local];
  const spinning = status === SYNC_STATUS.loading || status === SYNC_STATUS.saving;

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs"
      style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
    >
      <Icon size={13} className={spinning ? "animate-spin-slow" : undefined} />
      {label}
    </span>
  );
}
