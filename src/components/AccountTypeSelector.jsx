import { useState } from "react";
import { Check } from "lucide-react";
import { COLORS } from "../constants";

const ACCOUNT_TYPES = [
  {
    value: "personal",
    label: "Personal",
    description: "Keep your preparation activity out of the community view.",
  },
  {
    value: "community",
    label: "Community",
    description: "Share your mock activity in the community view.",
  },
];

export default function AccountTypeSelector({ value = "personal", onChange, compact = false }) {
  const [error, setError] = useState("");
  const selectedValue = value === "community" ? "community" : "personal";

  const selectAccountType = async (nextValue) => {
    if (nextValue === selectedValue) return;
    setError("");
    try {
      await onChange(nextValue);
    } catch (err) {
      setError(err.message || "The account type could not be updated. Try again.");
    }
  };

  return (
    <div>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : ""}`} role="radiogroup" aria-label="Account type">
        {ACCOUNT_TYPES.map((type) => {
          const selected = type.value === selectedValue;
          return (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectAccountType(type.value)}
              className="flex min-h-[112px] flex-col items-start rounded-lg border p-4 text-left hover:opacity-90"
              style={{
                background: selected ? `${COLORS.primary}10` : COLORS.surface2,
                borderColor: selected ? COLORS.primary : COLORS.border,
              }}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <strong className="text-sm" style={{ color: COLORS.ink }}>{type.label}</strong>
                <span
                  className="grid h-5 w-5 place-items-center rounded-full border"
                  style={{ background: selected ? COLORS.primary : COLORS.surface, borderColor: selected ? COLORS.primary : COLORS.border, color: COLORS.onPrimary }}
                  aria-hidden="true"
                >
                  {selected && <Check size={13} strokeWidth={3} />}
                </span>
              </span>
              <span className="mt-2 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{type.description}</span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-3 text-sm" style={{ color: COLORS.danger }}>{error}</p>}
    </div>
  );
}
