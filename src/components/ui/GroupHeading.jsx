import { COLORS, TYPE } from "../../constants";

/* Breaks a long stack of panels into labeled groups so a page that's mostly
   one continuous scroll of similar-looking cards stays scannable. Purely a
   visual divider — carries no state and changes no layout. */
export default function GroupHeading({ children }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <span style={{ ...TYPE.label, color: COLORS.inkMuted, whiteSpace: "nowrap" }}>{children}</span>
      <span style={{ height: 1, flex: 1, background: COLORS.border }} />
    </div>
  );
}
