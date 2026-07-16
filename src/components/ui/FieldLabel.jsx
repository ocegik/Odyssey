import { COLORS, TYPE } from "../../constants";

export function FieldLabel({ children, optional, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
      {children}
      {optional && (
        <span className="px-1.5 rounded normal-case" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, fontSize: "10px", fontWeight: 500, letterSpacing: "normal", color: COLORS.inkMuted }}>
          optional
        </span>
      )}
    </label>
  );
}

export function inputStyle(hasError) {
  return {
    background: COLORS.surface,
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
