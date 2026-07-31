import { Component } from "react";
import { AlertTriangle, Download, RotateCcw } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../constants";

/**
 * Catches render crashes so a single malformed mock or analysis blob can't
 * white-screen the whole app.
 *
 * The important part isn't the message — it's the escape hatch. The user's
 * data is still sitting in localStorage at this point, so the fallback offers
 * to download it before anything else is tried. Without that, a crash that
 * reproduces on every load is indistinguishable from data loss.
 */

const STORAGE_KEYS = {
  mocks: "cat-mock-tracker:entries",
  settings: "cat-mock-tracker:settings",
  syllabus: "cat-mock-tracker:syllabus",
};

function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function downloadRescueBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    rescuedFrom: "error-boundary",
    ...Object.fromEntries(Object.entries(STORAGE_KEYS).map(([name, key]) => [name, readStored(key)])),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `odyssey-rescue-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const buttonStyle = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.surface,
  color: COLORS.ink,
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 650,
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No error-reporting backend on a static site — the console is the only
    // place a stack trace can go, and it's what a bug report will need.
    console.error("Odyssey crashed while rendering:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-start justify-center p-6" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
        <div
          className="w-full max-w-xl mt-16 p-6 flex flex-col gap-4"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} style={{ color: COLORS.danger }} />
            <h1 style={TYPE.panelTitle}>Something broke while rendering</h1>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
            Your logged mocks and settings are still saved on this device — this is a display problem, not lost data.
            Download a backup first, then reload. If it keeps crashing, the backup file has everything needed to
            restore into a fresh session.
          </p>

          <pre
            className="text-xs p-3 overflow-x-auto"
            style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.danger, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {error.message || String(error)}
          </pre>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadRescueBackup} className="theme-hover inline-flex items-center gap-1.5 px-4 py-2 text-sm" style={buttonStyle}>
              <Download size={14} /> Download backup
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm hover:opacity-90"
              style={{ ...buttonStyle, background: COLORS.primary, color: COLORS.onPrimary, border: "none" }}
            >
              <RotateCcw size={14} /> Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
