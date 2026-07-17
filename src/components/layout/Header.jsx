import { Moon, Sun } from "lucide-react";
import { COLORS, TYPE } from "../../constants";

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="32" height="32" rx="7" fill={COLORS.primary} />
      <circle cx="16" cy="16" r="8" fill="none" stroke={COLORS.onPrimary} strokeWidth="4.5" />
      <circle cx="21.66" cy="10.34" r="3.2" fill={COLORS.warn} />
    </svg>
  );
}

export default function Header({ theme, onToggleTheme }) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div className="flex items-baseline gap-2">
            <h1 style={TYPE.pageTitle}>Odyssey</h1>
            <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>CAT Mock Tracker</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: COLORS.inkMuted }}>Sectional performance across VARC · DILR · Quant</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onToggleTheme} className="theme-hover flex items-center gap-1.5 px-3 py-2 text-sm"
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          <ThemeIcon size={14} /> {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}
