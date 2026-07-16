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
    shadowCard: "0 1px 2px rgba(30,36,32,0.05)",
    shadowFloating: "0 4px 16px rgba(30,36,32,0.18)",
  },
  dark: {
    bg: "#111410",
    surface: "#1A1F1B",
    surface2: "#232920",
    border: "#3A4238",
    ink: "#F2F4ED",
    inkMuted: "#A8B0A1",
    varc: "#F07268",
    varcSoft: "#3A211F",
    dilr: "#55B8C8",
    dilrSoft: "#193238",
    quant: "#E5B85C",
    quantSoft: "#382D19",
    good: "#6EC992",
    danger: "#F07268",
    hover: "rgba(242,244,237,0.07)",
    shadowCard: "0 1px 2px rgba(0,0,0,0.28)",
    shadowFloating: "0 4px 16px rgba(0,0,0,0.34)",
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
