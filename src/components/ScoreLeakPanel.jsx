import { Droplet } from "lucide-react";
import { COLORS, SECTIONS, SECTION_META, TYPE } from "../constants";
import { fmtNum, fmtPct } from "../lib/format";
import EmptyState from "./ui/EmptyState";

export const LEAK_WINDOW = 5;

/* Three ways marks go missing, each with a different fix — telling them
   apart is the entire point of this panel. Order matches the stacked bar. */
const BANDS = [
  { key: "marks", label: "Scored", color: COLORS.good },
  { key: "negativeCost", label: "Lost to negatives", color: COLORS.danger },
  { key: "wrongCost", label: "Wrong attempts", color: COLORS.warn },
  { key: "unattemptedCost", label: "Never attempted", color: COLORS.inkMuted },
];

/** One-line headline for a collapsed Disclosure — see components/ui/Disclosure. */
export function scoreLeakSummary(leak) {
  if (!leak || leak.sectionsWithData.length === 0) return "Needs attempted + correct counts";
  const { biggestLeak } = leak;
  if (!biggestLeak) return "No recoverable marks — a clean sweep";
  return `${biggestLeak.section}: ${fmtNum(biggestLeak.value, 0)} marks/mock to ${biggestLeak.label}`;
}

function StackedBar({ totals }) {
  const ceiling = totals.ceiling || 1;
  return (
    <div className="flex w-full overflow-hidden" style={{ height: 10, borderRadius: 999, background: COLORS.surface2 }}>
      {BANDS.map((band) => {
        const value = totals[band.key];
        if (!value || value <= 0) return null;
        return (
          <div
            key={band.key}
            title={`${band.label}: ${fmtNum(value / totals.mocks, 1)} marks/mock`}
            style={{ width: `${(value / ceiling) * 100}%`, background: band.color, height: "100%" }}
          />
        );
      })}
    </div>
  );
}

function SectionRow({ totals }) {
  const meta = SECTION_META[totals.section];

  if (totals.mocks === 0) {
    return (
      <div className="flex flex-col gap-1.5 p-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
        <span style={{ ...TYPE.label, color: meta.color }}>{totals.section}</span>
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>
          Needs total questions, attempted, correct and a score on the same mock.
        </span>
      </div>
    );
  }

  const perMock = totals.perMock;

  return (
    <div className="flex flex-col gap-2 p-3" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span style={{ ...TYPE.label, color: meta.color }}>{totals.section}</span>
        <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
          {fmtPct(totals.conversion)} of the max
        </span>
      </div>

      <StackedBar totals={totals} />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: COLORS.inkMuted }}>
        <span>
          <strong style={{ color: COLORS.good, fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(perMock.marks, 1)}</strong> scored
        </span>
        <span>
          <strong style={{ color: COLORS.danger, fontFamily: "'JetBrains Mono', monospace" }}>−{fmtNum(perMock.negativeCost, 1)}</strong> negatives
        </span>
        <span>
          <strong style={{ color: COLORS.warn, fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(perMock.wrongCost, 1)}</strong> wrong
        </span>
        <span>
          <strong style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(perMock.unattemptedCost, 1)}</strong> unattempted
        </span>
      </div>
    </div>
  );
}

/**
 * Where the marks actually went, per section, over recent mocks.
 *
 * A score alone says how much was lost but not to what — and the three
 * causes need completely different responses (attempt more / be more
 * accurate / pick better questions). This splits them apart exactly, using
 * the marking arithmetic rather than an estimate. See lib/scoreLeak.js.
 *
 * Rendered without card chrome: it always lives inside a Disclosure, which
 * supplies the title and border.
 */
export default function ScoreLeakPanel({ leak }) {
  if (leak.sectionsWithData.length === 0) {
    return (
      <EmptyState
        icon={Droplet}
        title="Not enough detail yet"
        body="This breakdown needs attempted and correct counts alongside the score. Add them when logging a mock — they're the two optional fields next to Score."
      />
    );
  }

  const { biggestLeak } = leak;

  return (
    <div className="flex flex-col gap-4 pt-4">
      {biggestLeak && (
        <p className="text-sm leading-relaxed p-3" style={{ background: COLORS.infoSoft, color: COLORS.ink, borderRadius: 8 }}>
          Biggest recoverable pool:{" "}
          <strong style={{ color: SECTION_META[biggestLeak.section].color }}>{biggestLeak.section}</strong> gives up{" "}
          <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(biggestLeak.value, 1)}</strong> marks a mock to{" "}
          {biggestLeak.label} — that's {biggestLeak.fix} problem.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SECTIONS.map((section) => (
          <SectionRow key={section} totals={leak.bySection[section]} />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs" style={{ color: COLORS.inkMuted }}>
        {BANDS.map((band) => (
          <span key={band.key} className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: band.color, display: "inline-block" }} />
            {band.label}
          </span>
        ))}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
        Each bar is the full section out of a perfect score, averaged over your last {LEAK_WINDOW} mocks. "Wrong
        attempts" is the marks those questions would have been worth if answered correctly; "lost to negatives" is what
        the penalty actually took off, derived from the score you logged rather than assumed from a marking scheme.
      </p>
    </div>
  );
}
