import { ShieldCheck } from "lucide-react";
import { COLORS, TABS } from "../../constants";

export default function TabNav({ activeTab, onChange, isAdmin = false }) {
  return (
    <nav
      className="tab-nav flex gap-1 p-1 flex-wrap"
      aria-label="Primary navigation"
      style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, width: "fit-content" }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = activeTab === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            className={`mobile-tap-target flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm ${active ? "" : "hover:bg-black/5"}`}
            style={{ borderRadius: 8, background: active ? COLORS.primary : "transparent", color: active ? COLORS.onPrimary : COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            <Icon size={14} /> {t.label}
          </button>
        );
      })}
      {isAdmin && (
        <a
          href="/admin"
          className="mobile-tap-target flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm hover:bg-black/5"
          style={{ borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
        >
          <ShieldCheck size={14} /> Admin
        </a>
      )}
    </nav>
  );
}
