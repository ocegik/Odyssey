import { useEffect, useState } from "react";
import { Hourglass, CalendarClock, ClipboardList, TrendingUp, Target, Trophy, Clock } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../constants";
import { fmtDate, fmtNum } from "../lib/format";
import { daysUntil, fmtDateLong, relativeDayLabel, prepProgressPercent, upcomingSchedule } from "../lib/dateMath";

const UPCOMING_LIMIT = 4; // the hero mock + up to 3 more in the mini list

// Day-granularity content doesn't need a live clock, but keeping a coarse
// ticker means the relative-day pill ("Today" -> "Passed") stays correct if
// the tab is left open across midnight.
function useNow(intervalMs = 5 * 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function windowLabel(entry) {
  if (entry.dateType === "range") return `${fmtDate(entry.windowStart)} – ${fmtDate(entry.windowEnd)}`;
  if (entry.dateType === "flexible") return `From ${fmtDate(entry.windowStart)}`;
  return "Fixed";
}

function Badge({ children, style }) {
  return (
    <span
      className="text-xs px-2 py-1"
      style={{ border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace", ...style }}
    >
      {children}
    </span>
  );
}

function Pill({ children, color }) {
  return (
    <span
      className="text-xs px-2 py-0.5"
      style={{ background: `${color}1a`, color, borderRadius: 999, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </span>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="flex flex-col gap-1">
      <div style={{ height: 8, borderRadius: 999, background: COLORS.surface2, overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: COLORS.primary, borderRadius: 999 }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: COLORS.inkMuted }}>Preparation progress</span>
        <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(percent, 0)}%</span>
      </div>
    </div>
  );
}

function CardShell({ icon: Icon, label, accent, right, children }) {
  return (
    <div className="p-5 flex flex-col gap-3 h-full" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: accent }} />
          <h3 style={TYPE.panelTitle}>{label}</h3>
        </div>
        {right}
      </div>
      <div className="flex-1 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function CatProgressCard({ catTargetDate, overallTargetPercentile }) {
  if (!catTargetDate) {
    return (
      <CardShell icon={Hourglass} label="CAT Progress" accent={COLORS.primary}>
        <span className="text-sm" style={{ color: COLORS.inkMuted }}>Set the CAT date in Settings</span>
      </CardShell>
    );
  }

  const daysLeft = daysUntil(catTargetDate);
  const percent = prepProgressPercent(catTargetDate);

  return (
    <CardShell icon={Hourglass} label="CAT Progress" accent={COLORS.primary}>
      <div className="flex-1 flex flex-col justify-center gap-5">
        <div className="flex items-start justify-between gap-4">
          {daysLeft < 0 ? (
            <span className="text-sm" style={{ color: COLORS.inkMuted }}>Exam date has passed</span>
          ) : (
            <div className="flex flex-col gap-0.5">
              <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 56, color: COLORS.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {daysLeft === 0 ? "Today" : daysLeft}
              </strong>
              {daysLeft > 0 && <span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Days remaining</span>}
            </div>
          )}
          <div className="flex flex-col gap-2 items-end shrink-0 text-right">
            <Badge>{fmtDateLong(catTargetDate)}</Badge>
            {overallTargetPercentile !== null && overallTargetPercentile !== undefined && (
              <Badge>{fmtNum(overallTargetPercentile, 1)}%ile target</Badge>
            )}
          </div>
        </div>
        {percent !== null && daysLeft >= 0 && <ProgressBar percent={percent} />}
      </div>
    </CardShell>
  );
}

function NextMockCard({ mockSchedule, nextTargetMarks }) {
  const upcoming = upcomingSchedule(mockSchedule);
  const nextMock = upcoming[0] || null;
  const laterMocks = upcoming.slice(1, UPCOMING_LIMIT);
  const extraCount = Math.max(0, upcoming.length - UPCOMING_LIMIT);

  if (!nextMock) {
    return (
      <CardShell icon={CalendarClock} label="Next Mock" accent={COLORS.info}>
        <span className="text-sm" style={{ color: COLORS.inkMuted }}>Add a mock schedule in Settings</span>
      </CardShell>
    );
  }

  return (
    <CardShell
      icon={CalendarClock}
      label="Next Mock"
      accent={COLORS.info}
      right={<Pill color={COLORS.info}>{relativeDayLabel(nextMock.date)}</Pill>}
    >
      <div className="flex flex-col gap-1">
        <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: COLORS.ink }}>{nextMock.examName}</strong>
        <span className="text-sm" style={{ color: COLORS.good, fontWeight: 650 }}>Target {fmtNum(nextTargetMarks, 0)} (auto)</span>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <Badge>{fmtDate(nextMock.date)}</Badge>
          <Badge style={{ textTransform: "capitalize" }}>{nextMock.dateType}</Badge>
          {nextMock.dateType !== "fixed" && <Badge>{windowLabel(nextMock)}</Badge>}
        </div>

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
      </div>
    </CardShell>
  );
}

function StatItem({ icon: Icon, value, label, accent }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}1a` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{value}</strong>
      </div>
      <span className="text-xs" style={{ color: COLORS.inkMuted, paddingLeft: 48 }}>{label}</span>
    </div>
  );
}

export function QuickStatsCard({ mocksLogged, latestMarks, avgLast3, bestMarksValue, pacing }) {
  const stats = [
    { icon: ClipboardList, value: mocksLogged, label: "Mocks logged", accent: COLORS.primary },
    { icon: TrendingUp, value: latestMarks !== null ? fmtNum(latestMarks, 1) : "-", label: "Latest marks", accent: COLORS.good },
    { icon: Trophy, value: bestMarksValue !== null ? fmtNum(bestMarksValue, 1) : "-", label: "Best marks", accent: COLORS.warn },
    { icon: Target, value: avgLast3 !== null ? fmtNum(avgLast3, 1) : "-", label: "Avg (last 3)", accent: COLORS.info },
    { icon: Clock, value: pacing ? `${fmtNum(pacing.recentPerWeek, 1)}/wk` : "-", label: "Current pace", accent: COLORS.primary },
  ];

  return (
    <CardShell icon={ClipboardList} label="Quick Stats" accent={COLORS.ink}>
      <div className="flex flex-wrap justify-between gap-y-4">
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} />
        ))}
      </div>
    </CardShell>
  );
}

export default function CountdownHero({
  catTargetDate,
  overallTargetPercentile,
  mockSchedule,
  nextTargetMarks,
}) {
  useNow();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <CatProgressCard catTargetDate={catTargetDate} overallTargetPercentile={overallTargetPercentile} />
      <NextMockCard mockSchedule={mockSchedule} nextTargetMarks={nextTargetMarks} />
    </div>
  );
}
