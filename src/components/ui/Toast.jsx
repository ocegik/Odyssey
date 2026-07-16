import { CircleCheck } from "lucide-react";
import { COLORS } from "../../constants";

export default function Toast({ toast }) {
  if (!toast) return null;
  const { message, action } = toast;
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{ background: COLORS.ink, color: COLORS.bg, borderRadius: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, zIndex: 50, boxShadow: "var(--shadow-floating)" }}
    >
      <CircleCheck size={15} /> {message}
      {action && (
        <button
          onClick={action.onClick}
          className="underline underline-offset-2 hover:opacity-80"
          style={{ color: COLORS.bg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
