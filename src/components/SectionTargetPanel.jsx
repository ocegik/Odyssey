import { SECTIONS, SECTION_META, COLORS, TYPE } from "../constants";
import { fmtNum } from "../lib/format";
import ProgressBar from "./ui/ProgressBar";
import HelpTip from "./ui/HelpTip";

/**
 * Per-section target vs current form.
 *
 * The section targets in Account previously only existed as faint dashed
 * lines on one Trends chart, which is a weak payoff for numbers the user
 * deliberately set. This turns them into the answer to "how far off am I,
 * and where?" — the question the whole app exists to answer.
 *
 * "Current" is the rolling 5-mock average rather than the latest score: a
 * single good or bad paper shouldn't make a target look met or blown.
 */
export function buildTargetRows(sectionStats, settings) {
  const targets = settings?.sectionTargetMarks || {};
  return SECTIONS
    .map((section) => {
      const target = targets[section];
      if (!Number.isFinite(target) || target <= 0) return null;
      const current = sectionStats?.[section]?.latest?.rollMarks;
      return {
        section,
        target,
        current: Number.isFinite(current) ? current : null,
        gap: Number.isFinite(current) ? current - target : null,
      };
    })
    .filter(Boolean);
}

/** Collapsed-row headline: the section furthest from its target. */
export function targetGapSummary(rows) {
  const withCurrent = rows.filter((row) => row.gap !== null);
  if (rows.length === 0) return "Set section targets in Account";
  if (withCurrent.length === 0) return "No scored mocks logged yet";
  const worst = withCurrent.reduce((acc, row) => (row.gap < acc.gap ? row : acc));
  if (worst.gap >= 0) return "Every targeted section is at or above its target";
  return `${worst.section} is ${fmtNum(Math.abs(worst.gap), 1)} marks below target`;
}

export default function SectionTargetPanel({ rows }) {
  const totalTarget = rows.reduce((sum, row) => sum + row.target, 0);
  const totalCurrent = rows.every((row) => row.current !== null)
    ? rows.reduce((sum, row) => sum + row.current, 0)
    : null;

  return (
    <div className="flex flex-col gap-4 pt-4">
      <span className="flex items-center gap-1 text-xs" style={{ color: COLORS.inkMuted }}>
        {totalCurrent !== null
          ? `Rolling 5-mock average — ${fmtNum(totalCurrent, 0)} / ${fmtNum(totalTarget, 0)} across targeted sections`
          : "Your rolling 5-mock average against section targets"}
        <HelpTip label="How target progress is calculated">Current form is the rolling average from your five most recent scored mocks in each section. This avoids treating one unusually easy or difficult mock as your new baseline.</HelpTip>
      </span>

      <div className="flex flex-col gap-3.5">
        {rows.map((row) => {
          const meta = SECTION_META[row.section];
          const met = row.gap !== null && row.gap >= 0;
          const percent = row.current !== null ? (row.current / row.target) * 100 : 0;

          return (
            <div key={row.section} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span style={{ ...TYPE.label, color: meta.color }}>{row.section}</span>
                <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.inkMuted }}>
                  {row.current !== null ? fmtNum(row.current, 1) : "—"} / {fmtNum(row.target, 0)}
                  {row.gap !== null && (
                    <strong style={{ color: met ? COLORS.good : COLORS.danger, marginLeft: 8 }}>
                      {met ? "+" : ""}{fmtNum(row.gap, 1)}
                    </strong>
                  )}
                </span>
              </div>
              <ProgressBar percent={percent} color={met ? COLORS.good : meta.color} />
              {row.current === null && (
                <span className="text-xs" style={{ color: COLORS.inkMuted }}>No scored mock has been logged for this section.</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
