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
  dangerSoft: "var(--color-danger-soft)",
  warn: "var(--color-warn)",
  warnSoft: "var(--color-warn-soft)",
  info: "var(--color-info)",
  infoSoft: "var(--color-info-soft)",
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
    varc: "#D14E22",
    varcSoft: "#F7E1D9",
    dilr: "#1D7A52",
    dilrSoft: "#CDEEE1",
    quant: "#3E6FBF",
    quantSoft: "#D6E3F5",
    good: "#3F8F5F",
    danger: "#B8433D",
    dangerSoft: "#F3DFDE",
    warn: "#BD8420",
    warnSoft: "#F2E5C9",
    info: "#1F6E7F",
    infoSoft: "#DCEBEC",
    primary: "#5E3159",
    primaryHover: "#3C2039",
    onPrimary: "#FFFFFF",
    hover: "rgba(30,36,32,0.05)",
    focusRing: "rgba(94,49,89,0.4)",
    shadowCard: "0 1px 2px rgba(30,36,32,0.05)",
    shadowFloating: "0 4px 16px rgba(30,36,32,0.18)",
  },
  dark: {
    bg: "#121212",
    surface: "#1E1E1E",
    surface2: "#262626",
    border: "#3A3A3A",
    ink: "#F2F2F2",
    inkMuted: "#A3A3A3",
    varc: "#F19A7D",
    varcSoft: "#4C3529",
    dilr: "#57CF9B",
    dilrSoft: "#214432",
    quant: "#94B2E3",
    quantSoft: "#242B36",
    good: "#70CB94",
    danger: "#F48A80",
    dangerSoft: "#4D312A",
    warn: "#E8BD63",
    warnSoft: "#4F3D1E",
    info: "#5CBED0",
    infoSoft: "#1F4750",
    primary: "#B554AA",
    primaryHover: "#C170B8",
    onPrimary: "#FFFFFF",
    hover: "rgba(255,255,255,0.06)",
    focusRing: "rgba(181,84,170,0.5)",
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
