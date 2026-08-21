import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { COLORS, TABS, TYPE } from "../constants";
import { fmtDate } from "../lib/format";

/**
 * ⌘K / Ctrl-K palette: jump to any tab, open a specific mock's analysis, or
 * fire a data action.
 *
 * Deliberately zero-footprint — it keeps the daily view uncluttered while
 * removing a lot of clicking for anyone who wants it. Everything reachable
 * here is reachable the normal way too; this is a shortcut, never the only
 * path.
 */

function scoreMatch(haystack, query) {
  const text = haystack.toLowerCase();
  if (text.startsWith(query)) return 2;
  if (text.includes(query)) return 1;
  return 0;
}

function useCommands({ mocks, onNavigate, onOpenAnalysis, onExport, onToggleTheme, theme }) {
  return useMemo(() => {
    const commands = TABS.map((tab) => ({
      id: `tab:${tab.key}`,
      label: `Go to ${tab.label}`,
      hint: "Navigate",
      icon: tab.icon,
      run: () => onNavigate(tab.key),
    }));

    commands.push({
      id: "action:theme",
      label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      hint: "Action",
      run: onToggleTheme,
    });

    commands.push({
      id: "action:export",
      label: "Export a full backup",
      hint: "Action",
      run: onExport,
    });

    // Most recent first — the mock you want is almost always a recent one.
    [...mocks].reverse().forEach((mock) => {
      commands.push({
        id: `mock:${mock.id}`,
        label: `${mock.source} — ${fmtDate(mock.date)}`,
        hint: mock.analysis ? "Open analysis" : "Add analysis",
        run: () => onOpenAnalysis(mock.id),
      });
    });

    return commands;
  }, [mocks, onNavigate, onOpenAnalysis, onExport, onToggleTheme, theme]);
}

export default function CommandPalette(props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const commands = useCommands(props);

  useEffect(() => {
    const onKeyDown = (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setOpen((current) => !current);
        setQuery("");
        setCursor(0);
      }
      if (ev.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 8);
    return commands
      .map((command) => ({ command, score: scoreMatch(`${command.label} ${command.hint}`, q) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((row) => row.command);
  }, [commands, query]);

  if (!open) return null;

  const runAt = (index) => {
    const command = results[index];
    if (!command) return;
    setOpen(false);
    command.run();
  };

  const onInputKeyDown = (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setCursor((c) => (c + 1) % Math.max(results.length, 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1));
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      runAt(cursor);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="animate-scale-in mt-[8vh] flex w-full max-w-lg flex-col overflow-hidden sm:mt-[12vh]"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "var(--shadow-floating)", maxHeight: "calc(100dvh - 2rem)" }}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <Search size={16} style={{ color: COLORS.inkMuted, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(ev) => {
              setQuery(ev.target.value);
              setCursor(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a tab, a mock, or an action…"
            className="flex-1 py-3.5 text-sm"
            style={{ background: "transparent", border: "none", outline: "none", color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center" style={{ color: COLORS.inkMuted }}>No matches.</p>
        ) : (
          <ul className="max-h-[min(24rem,calc(100dvh-10rem))] overflow-y-auto py-1.5">
            {results.map((command, index) => {
              const Icon = command.icon;
              const active = index === cursor;
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => runAt(index)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm"
                    style={{ background: active ? COLORS.hover : "transparent", border: "none", color: COLORS.ink }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {Icon ? <Icon size={14} style={{ color: COLORS.inkMuted, flexShrink: 0 }} /> : <span style={{ width: 14 }} />}
                      <span className="truncate">{command.label}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 text-xs" style={{ color: COLORS.inkMuted }}>
                      {command.hint}
                      {active && <CornerDownLeft size={12} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-4 py-2 text-xs flex gap-3" style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.inkMuted, ...TYPE.label, textTransform: "none", letterSpacing: 0 }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
