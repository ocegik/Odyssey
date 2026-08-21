import { COLORS, TYPE } from "../../constants";
import HelpTip from "./HelpTip";

export function FieldLabel({ children, optional, htmlFor, hint }) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} style={{ ...TYPE.label, color: COLORS.inkMuted }}>
        {children}
        {optional && (
          <span className="ml-1.5 px-1.5 rounded normal-case" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, fontSize: "10px", fontWeight: 500, letterSpacing: "normal", color: COLORS.inkMuted }}>
            optional
          </span>
        )}
      </label>
      {hint && <HelpTip label={`About ${typeof children === "string" ? children : "this field"}`}>{hint}</HelpTip>}
    </div>
  );
}

export function inputStyle(hasError) {
  return {
    /* backgroundColor, not the `background` shorthand — the shorthand would
       reset background-image and wipe out selectStyle's chevron. */
    backgroundColor: COLORS.surface,
    border: `1px solid ${hasError ? COLORS.danger : COLORS.border}`,
    borderRadius: 8,
    padding: "9px 11px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "14px",
    color: COLORS.ink,
    width: "100%",
    outline: "none",
  };
}

/* A <select> left at appearance:auto keeps the OS-drawn control chrome — on
   macOS a beveled, glossy pop-up button that ignores the background and border
   set here — so it reads as a completely different material from the flat
   inputs it sits next to. Resetting the appearance and painting our own
   chevron (--select-chevron, themed in App.jsx) makes the two match. */
export function selectStyle(hasError) {
  return {
    ...inputStyle(hasError),
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
    paddingRight: 30,
    backgroundImage: "var(--select-chevron)",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "14px 14px",
  };
}
