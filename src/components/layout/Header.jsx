import { Moon, Sun } from "lucide-react";
import { COLORS, TYPE } from "../../constants";
import SyncBadge from "./SyncBadge";
import AuthControl from "./AuthControl";

function LogoMark() {
  return (
    <img src="/newicon/favicon.svg" width="30" height="30" alt="" aria-hidden="true" style={{ flexShrink: 0 }} />
  );
}

export default function Header({ theme, onToggleTheme, syncStatuses, auth, onSignedOut }) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 style={TYPE.pageTitle}>Odyssey</h1>
            <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>CAT Mock Tracker</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: COLORS.inkMuted }}>Sectional performance across VARC · DILR · Quant</p>
      </div>
      <div className="flex w-full gap-2 flex-wrap items-center sm:w-auto sm:flex-nowrap">
        <SyncBadge statuses={syncStatuses} />
        <AuthControl auth={auth} onSignedOut={onSignedOut} />
        <button onClick={onToggleTheme} className="theme-hover flex items-center gap-1.5 px-3 py-2 text-sm"
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <ThemeIcon size={14} /> {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}
