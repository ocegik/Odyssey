import ChartFrame from "./ChartFrame";
import { InsightHero, toneMeta } from "./InsightHero";

/**
 * The page-level "what are my biggest problems" answer: a small, ranked set
 * of hero-style callouts merged across every insight source (section, set,
 * topic). Item 1 keeps the "TOP SIGNAL" badge; the rest are numbered so
 * several heroes in one feed read as a ranking instead of competing #1s.
 */
export default function TopSignals({ signals }) {
  return (
    <ChartFrame
      title="Top signals"
      note="Patterns across sections, sets, and topics"
      empty={!signals || signals.length === 0 ? "Log and analyse more mocks to identify repeated patterns." : null}
    >
      <div className="flex flex-col gap-3">
        {signals.map((signal, index) => {
          const tone = toneMeta(signal.tone);
          return (
            <InsightHero
              key={signal.id}
              insight={signal}
              Icon={tone.Icon}
              tone={tone}
              badge={index === 0 ? "TOP SIGNAL" : `#${index + 1}`}
            />
          );
        })}
      </div>
    </ChartFrame>
  );
}
