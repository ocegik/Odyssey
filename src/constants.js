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
  primary: "var(--color-primary)",
  primaryHover: "var(--color-primary-hover)",
  onPrimary: "var(--color-on-primary)",
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
    primary: "#B8433D",
    primaryHover: "#9E362F",
    onPrimary: "#FFFFFF",
    hover: "rgba(30,36,32,0.05)",
    focusRing: "rgba(184,67,61,0.4)",
    shadowCard: "0 1px 2px rgba(30,36,32,0.05)",
    shadowFloating: "0 4px 16px rgba(30,36,32,0.18)",
  },
  dark: {
    bg: "#0C0E09",
    surface: "#1D2116",
    surface2: "#262B1D",
    border: "#4B5440",
    ink: "#F5F7F0",
    inkMuted: "#B6BEAB",
    varc: "#F48A80",
    varcSoft: "#552E26",
    dilr: "#5CBED0",
    dilrSoft: "#1F4750",
    quant: "#E8BD63",
    quantSoft: "#4F3D1E",
    good: "#70CB94",
    danger: "#F48A80",
    primary: "#F48A80",
    primaryHover: "#F9A499",
    onPrimary: "#2B120D",
    hover: "rgba(243,245,238,0.08)",
    focusRing: "rgba(244,138,128,0.5)",
    shadowCard: "0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)",
    shadowFloating: "0 10px 28px rgba(0,0,0,0.6)",
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
  { key: "analysisInsights", label: "Insights", icon: BarChart3 },
  { key: "trends", label: "Trends", icon: LineChartIcon },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "about", label: "About", icon: Info },
];
