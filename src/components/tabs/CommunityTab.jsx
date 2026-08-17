import { useMemo } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { COLORS, SECTIONS, SHADOW, TYPE } from "../../constants";
import { mockTotalMarks } from "../../lib/compute";
import { fmtNum } from "../../lib/format";
import { latestKnownPercentile } from "../../lib/percentile";
import { computeSyllabusStats } from "../../lib/syllabusModel";
import { normalizeQuickMathProgress } from "../../lib/quickMath";

const COMMUNITY_PULSE = [
  { label: "Learners active this week", value: "8,420", note: "+12% vs last week", icon: UsersRound, accent: COLORS.primary },
  { label: "Mocks logged", value: "2,486", note: "across 19 prep sources", icon: ClipboardCheck, accent: COLORS.info },
  { label: "Study plans completed", value: "74%", note: "of this week’s planned blocks", icon: CheckCircle2, accent: COLORS.good },
  { label: "Quick Math answers", value: "61.8k", note: "with 78% accuracy", icon: Sparkles, accent: COLORS.warn },
];

const SECTION_PULSE = [
  { section: "VARC", detail: "Reading comprehension is the most-practised focus this week.", progress: 76, color: COLORS.varc },
  { section: "DILR", detail: "Set selection is the most-shared skill target.", progress: 63, color: COLORS.dilr },
  { section: "Quant", detail: "Arithmetic remains the community’s top revision theme.", progress: 71, color: COLORS.quant },
];

const COMMUNITY_MILESTONES = [
  { icon: Trophy, accent: COLORS.warn, title: "1,164 learners reached their 5-mock milestone", detail: "The most common next step: review one section before logging mock six." },
  { icon: Target, accent: COLORS.primary, title: "792 target percentiles were updated this week", detail: "Small, frequent target adjustments are more common than major jumps." },
  { icon: Flame, accent: COLORS.varc, title: "2,018 seven-day study streaks are live", detail: "Consistency is the community’s most frequently unlocked milestone." },
];

function Card({ children, className = "" }) {
  return (
    <section
      className={`p-5 sm:p-6 ${className}`}
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
    >
      {children}
    </section>
  );
}

function ProgressTrack({ value, color }) {
  return (
    <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: COLORS.surface2 }}>
      <div style={{ width: `${value}%`, height: "100%", borderRadius: 999, background: color }} />
    </div>
  );
}

function nextMockMilestone(mockCount) {
  const milestones = [1, 3, 5, 10, 15, 20];
  return milestones.find((milestone) => milestone > mockCount) || mockCount + 5;
}

export default function CommunityTab({ mocks, syllabusProgress, quickMathProgress }) {
  const syllabusStats = useMemo(() => computeSyllabusStats(syllabusProgress), [syllabusProgress]);
  const quickMath = useMemo(() => normalizeQuickMathProgress(quickMathProgress), [quickMathProgress]);
  const scoredMocks = useMemo(() => mocks.filter((mock) => mockTotalMarks(mock) !== null), [mocks]);
  const percentile = useMemo(() => latestKnownPercentile(mocks), [mocks]);
  const mockMilestone = nextMockMilestone(mocks.length);
  const mockProgress = Math.min(100, (mocks.length / mockMilestone) * 100);
  const syllabusMilestone = Math.min(100, Math.ceil((syllabusStats.overall.percent + 1) / 25) * 25 || 25);
  const syllabusProgressToMilestone = Math.min(100, (syllabusStats.overall.percent / syllabusMilestone) * 100);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <Card className="overflow-hidden relative">
        <div
          aria-hidden="true"
          className="absolute"
          style={{ width: 210, height: 210, borderRadius: "50%", right: -74, top: -106, background: `${COLORS.primary}14` }}
        />
        <div className="relative flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2" style={{ color: COLORS.primary }}>
              <UsersRound size={17} />
              <span style={TYPE.label}>Odyssey community pulse</span>
            </div>
            <h1 className="mt-3" style={{ ...TYPE.pageTitle, fontSize: 28 }}>A little perspective for the road ahead.</h1>
            <p className="mt-2 text-sm leading-6" style={{ color: COLORS.inkMuted }}>
              See how CAT preparation is moving across the community—quietly, anonymously, and without the noise of a social feed.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 text-xs shrink-0" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.inkMuted }}>
            <BarChart3 size={14} style={{ color: COLORS.info }} />
            Weekly snapshot
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COMMUNITY_PULSE.map(({ icon: Icon, label, value, note, accent }) => (
          <Card key={label} className="!p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18` }}>
                <Icon size={17} style={{ color: accent }} />
              </div>
              {note.startsWith("+") && <span className="flex items-center gap-0.5 text-xs" style={{ color: COLORS.good, fontWeight: 700 }}><ArrowUpRight size={13} /> 12%</span>}
            </div>
            <strong className="block mt-5" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 27, fontWeight: 700, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{value}</strong>
            <p className="mt-1 text-sm" style={{ color: COLORS.ink }}>{label}</p>
            <p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{note}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 items-start">
        <Card>
          <div className="flex items-center gap-2">
            <BarChart3 size={17} style={{ color: COLORS.info }} />
            <h2 style={TYPE.panelTitle}>What the community is working on</h2>
          </div>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>Top preparation themes from this week’s activity.</p>
          <div className="mt-5 flex flex-col gap-5">
            {SECTION_PULSE.map(({ section, detail, progress, color }) => (
              <div key={section} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <strong className="text-sm" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{section}</strong>
                  <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>{progress}% activity share</span>
                </div>
                <ProgressTrack value={progress} color={color} />
                <p className="text-xs leading-5" style={{ color: COLORS.inkMuted }}>{detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Trophy size={17} style={{ color: COLORS.warn }} />
            <h2 style={TYPE.panelTitle}>Milestone board</h2>
          </div>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>A few recent markers worth celebrating.</p>
          <div className="mt-4 flex flex-col">
            {COMMUNITY_MILESTONES.map(({ icon: Icon, accent, title, detail }, index) => (
              <div key={title} className="flex gap-3 py-4" style={index ? { borderTop: `1px solid ${COLORS.border}` } : undefined}>
                <div className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}18` }}>
                  <Icon size={15} style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-sm leading-5" style={{ color: COLORS.ink, fontWeight: 600 }}>{title}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Target size={17} style={{ color: COLORS.primary }} />
              <h2 style={TYPE.panelTitle}>Your next milestones</h2>
            </div>
            <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>Personal markers, shown alongside the wider community pulse.</p>
          </div>
          {percentile && (
            <span className="px-2.5 py-1.5 text-xs" style={{ borderRadius: 999, background: COLORS.infoSoft, color: COLORS.info, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
              Latest {fmtNum(percentile.value, 2)}%ile
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.surface2 }}>
            <div className="flex items-center gap-2"><ClipboardCheck size={15} style={{ color: COLORS.info }} /><span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Mock rhythm</span></div>
            <p className="mt-3 text-sm" style={{ color: COLORS.ink }}><strong>{mocks.length}</strong> logged · next marker: <strong>{mockMilestone} mocks</strong></p>
            <div className="mt-3"><ProgressTrack value={mockProgress} color={COLORS.info} /></div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.surface2 }}>
            <div className="flex items-center gap-2"><BookOpenCheck size={15} style={{ color: COLORS.dilr }} /><span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Syllabus coverage</span></div>
            <p className="mt-3 text-sm" style={{ color: COLORS.ink }}><strong>{syllabusStats.overall.percent}% complete</strong> · next marker: <strong>{syllabusMilestone}%</strong></p>
            <div className="mt-3"><ProgressTrack value={syllabusProgressToMilestone} color={COLORS.dilr} /></div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.surface2 }}>
            <div className="flex items-center gap-2"><Sparkles size={15} style={{ color: COLORS.warn }} /><span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Quick Math</span></div>
            <p className="mt-3 text-sm" style={{ color: COLORS.ink }}><strong>{quickMath.totalAnswered || 0} answers</strong> · {quickMath.currentStreak ? `${quickMath.currentStreak}-day streak` : "start your first streak"}</p>
            <p className="mt-3 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{scoredMocks.length ? `${scoredMocks.length} scored mocks give your prep trend more shape.` : "Log a scored mock to begin shaping your prep trend."}</p>
          </div>
        </div>
      </Card>

      <p className="px-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>
        Community data is aggregated and anonymous. Community is intentionally a pulse, not a social network—there are no profiles, messages, or public activity feeds.
      </p>
    </div>
  );
}
