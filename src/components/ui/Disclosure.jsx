import { ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, TYPE } from "../../constants";
import { useDisclosure } from "../../hooks/useDisclosure";

/**
 * A collapsed-by-default section for depth that shouldn't compete with the
 * daily view.
 *
 * Collapsed it's a single slim row — a label, a one-line summary of what's
 * inside, and a chevron. That summary matters: a row that only says
 * "Advanced" is a dead end, while one that says "Quant leaks 55.8 marks a
 * mock" tells you whether opening it is worth your time. Cheap peripheral
 * information, no vertical cost.
 *
 * Children are only rendered while open, so collapsed panels cost nothing to
 * mount — which is what keeps stacking several of these on one tab free.
 */
export default function Disclosure({ id, title, summary, defaultOpen = false, children }) {
  const [open, toggle] = useDisclosure(id, defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "var(--shadow-card)" }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="theme-hover w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
        style={{ background: "transparent", border: "none", borderRadius: 12 }}
      >
        <span className="flex items-center gap-2 shrink-0">
          <Chevron size={15} style={{ color: COLORS.inkMuted, flexShrink: 0 }} />
          <span style={{ ...TYPE.chartTitle, whiteSpace: "nowrap" }}>{title}</span>
        </span>
        {summary && (
          <span className="text-xs truncate text-right hidden sm:block min-w-0" style={{ color: COLORS.inkMuted }}>
            {summary}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-up px-5 pb-5 pt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}
