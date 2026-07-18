import { useEffect, useState } from "react";
import { Hourglass, CalendarClock } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../constants";
import { fmtDate, fmtNum } from "../lib/format";
import { countdownParts, upcomingSchedule } from "../lib/dateMath";

const UPCOMING_LIMIT = 4; // the hero mock + up to 3 more in the mini list

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Tile({ value, label }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5 flex-1"
      style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 6px", minWidth: 64 }}
    >
      <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 30, color: COLORS.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {value}
      </strong>
      <span style={{ ...TYPE.label, color: COLORS.inkMuted, fontSize: "9px" }}>{label}</span>
    </div>
  );
}

function CountdownTiles({ parts }) {
  if (parts.isToday) {
    return (
      <div className="py-2 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: COLORS.good }}>
        Today
      </div>
    );
  }
  if (parts.past) {
    return (
      <div className="py-2 text-center text-sm" style={{ color: COLORS.inkMuted }}>
        Date has passed
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Tile value={parts.weeks} label="Weeks" />
      <Tile value={parts.days} label="Days" />
      <Tile value={parts.hours} label="Hours" />
    </div>
  );
}

function CardShell({ icon: Icon, label, accent, children }) {
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: accent }} />
        <h3 style={TYPE.panelTitle}>{label}</h3>
      </div>
      {children}
    </div>
  );
}

export default function CountdownHero({ catTargetDate, mockSchedule, nextTargetMarks }) {
  const now = useNow();
  const catParts = catTargetDate ? countdownParts(catTargetDate, now) : null;

  const upcoming = upcomingSchedule(mockSchedule);
  const nextMock = upcoming[0] || null;
  const laterMocks = upcoming.slice(1, UPCOMING_LIMIT);
  const extraCount = Math.max(0, upcoming.length - UPCOMING_LIMIT);
  const mockParts = nextMock ? countdownParts(nextMock.date, now) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CardShell icon={Hourglass} label="CAT Countdown" accent={COLORS.primary}>
        {catParts ? (
          <>
            <CountdownTiles parts={catParts} />
            <span className="text-xs" style={{ color: COLORS.inkMuted }}>{fmtDate(catTargetDate)}</span>
          </>
        ) : (
          <span className="text-sm" style={{ color: COLORS.inkMuted }}>Set the CAT date in Settings</span>
        )}
      </CardShell>

      <CardShell icon={CalendarClock} label="Next Mock" accent={COLORS.info}>
        {nextMock ? (
          <>
            <CountdownTiles parts={mockParts} />
            <span className="text-xs" style={{ color: COLORS.inkMuted }}>
              {fmtDate(nextMock.date)} · {nextMock.examName} · target {fmtNum(nextTargetMarks, 0)} (auto)
            </span>

            {laterMocks.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                {laterMocks.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-xs gap-2">
                    <span style={{ color: COLORS.ink }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(entry.date)}</span> · {entry.examName}
                    </span>
                    <span style={{ color: COLORS.inkMuted, textTransform: "capitalize" }}>{entry.dateType}</span>
                  </div>
                ))}
                {extraCount > 0 && (
                  <span className="text-xs" style={{ color: COLORS.inkMuted }}>+{extraCount} more — see Settings</span>
                )}
              </div>
            )}
          </>
        ) : (
          <span className="text-sm" style={{ color: COLORS.inkMuted }}>Add a mock schedule in Settings</span>
        )}
      </CardShell>
    </div>
  );
}
