import { Moon, Sun } from "lucide-react";
import { COLORS, TYPE } from "../../constants";

export default function Header({ theme, onToggleTheme }) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h1 style={TYPE.pageTitle}>CAT Mock Tracker</h1>
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
