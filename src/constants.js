import { BarChart3, ClipboardList, LineChart as LineChartIcon, LayoutDashboard, Info, FileSearch, Settings } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');";

export const COLORS = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surface2: "var(--color-surface-2)",
  border: "var(--color-border)",
  ink: "var(--color-ink)",
  inkMuted: "var(--color-ink-muted)",
  varc: "var(--color-varc)",
  varcSoft: "var(--color-varc-soft)",
  dilr: "var(--color-dilr)",
  dilrSoft: "var(--color-dilr-soft)",
  quant: "var(--color-quant)",
  quantSoft: "var(--color-quant-soft)",
  good: "var(--color-good)",
  danger: "var(--color-danger)",
  hover: "var(--color-hover)",
  focusRing: "var(--color-focus-ring)",
};

export const THEME_COLORS = {
  light: {
    bg: "#F5F6F1",
    surface: "#FFFFFF",
    surface2: "#FBFBF8",
    border: "#DDE0D6",
    ink: "#1E2420",
    inkMuted: "#6E7568",
    varc: "#B8433D",
    varcSoft: "#F4DEDC",
    dilr: "#1F6E7F",
    dilrSoft: "#DCEBEC",
    quant: "#BD8420",
    quantSoft: "#F2E5C9",
    good: "#3F8F5F",
    danger: "#B8433D",
    hover: "rgba(30,36,32,0.05)",
    focusRing: "rgba(30,36,32,0.35)",
    shadowCard: "0 1px 2px rgba(30,36,32,0.05)",
    shadowFloating: "0 4px 16px rgba(30,36,32,0.18)",
  },
  dark: {
    bg: "#0A0B08",
    surface: "#15170F",
    surface2: "#1D2018",
    border: "#2E3327",
    ink: "#F3F5EE",
    inkMuted: "#9CA495",
    varc: "#F1786D",
    varcSoft: "#3D231F",
    dilr: "#5CBED0",
    dilrSoft: "#1B363C",
    quant: "#E8BD63",
    quantSoft: "#3C301B",
    good: "#70CB94",
    danger: "#F1786D",
    hover: "rgba(243,245,238,0.06)",
    focusRing: "rgba(243,245,238,0.4)",
    shadowCard: "0 1px 2px rgba(0,0,0,0.45)",
    shadowFloating: "0 10px 28px rgba(0,0,0,0.55)",
  },
};

/* Reusable typography tiers so every panel/card/chart heading shares one
   consistent scale instead of relying on unset browser defaults. */
export const TYPE = {
  pageTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "21px", letterSpacing: "-0.01em" },
  panelTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "16px", letterSpacing: "-0.005em" },
  chartTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "14px" },
  label: { fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" },
};

/* Single subtle elevation used on flat surfaces — kept intentionally faint. */
export const SHADOW = { card: "var(--shadow-card)" };

export const SECTIONS = ["VARC", "DILR", "Quant"];

export const SECTION_META = {
  VARC: { color: COLORS.varc, soft: COLORS.varcSoft, label: "VARC" },
  DILR: { color: COLORS.dilr, soft: COLORS.dilrSoft, label: "DILR" },
  Quant: { color: COLORS.quant, soft: COLORS.quantSoft, label: "Quant" },
};

export const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "log", label: "Mock log", icon: ClipboardList },
  { key: "analysis", label: "Mock analysis", icon: FileSearch },
  { key: "analysisInsights", label: "Analysis Insights & Data", icon: BarChart3 },
  { key: "trends", label: "Trends", icon: LineChartIcon },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "about", label: "About", icon: Info },
];
