import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import { COLORS } from "../../constants";

/* Shows additional context only when asked, keeping dense screens readable. */
export default function HelpTip({ children, label = "How this works", align = "start" }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex shrink-0 align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
        className="inline-flex items-center justify-center rounded-full"
        style={{ width: 18, height: 18, color: COLORS.inkMuted, background: "transparent", cursor: "help" }}
      >
        <CircleHelp size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute z-40 block p-3 text-left text-xs leading-5"
          style={{
            top: "calc(100% + 7px)",
            left: align === "end" ? "auto" : 0,
            right: align === "end" ? 0 : "auto",
            width: "min(18rem, calc(100vw - 2rem))",
            background: COLORS.ink,
            color: COLORS.surface,
            borderRadius: 8,
            boxShadow: "var(--shadow-floating)",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            letterSpacing: "normal",
            textTransform: "none",
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
