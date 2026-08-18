import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  Flame,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../../constants";
import { fmtNum } from "../../lib/format";
import { supabase } from "../../lib/supabaseClient";
import { buildPersonalCommunityStats, normalizeCommunityDashboard } from "../../lib/communityStats";
import { computeSyllabusStats } from "../../lib/syllabusModel";
import { normalizeQuickMathProgress } from "../../lib/quickMath";
import AccountTypeSelector from "../AccountTypeSelector";

const numberFormatter = new Intl.NumberFormat("en-IN");

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

function StatCard({ icon: Icon, label, value, note, accent }) {
  return (
    <Card className="!p-5">
      <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18` }}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <strong className="block mt-5" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 27, fontWeight: 700, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{value}</strong>
      <p className="mt-1 text-sm" style={{ color: COLORS.ink }}>{label}</p>
      <p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{note}</p>
    </Card>
  );
}

function score(value) {
  return value === null || value === undefined ? "—" : fmtNum(value, 1);
}

function CommunityLoading() {
  return <p className="py-5 text-sm" style={{ color: COLORS.inkMuted }}>Loading live community data…</p>;
}

function CommunityUnavailable({ message }) {
  return <p className="py-5 text-sm leading-6" role="status" style={{ color: COLORS.inkMuted }}>{message}</p>;
}

export default function CommunityTab({ mocks, syllabusProgress, quickMathProgress, accountType, onUpdateAccountType }) {
  const [community, setCommunity] = useState({ status: "loading", data: null, error: "" });
  const personal = useMemo(() => buildPersonalCommunityStats(mocks), [mocks]);
  const syllabusStats = useMemo(() => computeSyllabusStats(syllabusProgress), [syllabusProgress]);
  const quickMath = useMemo(() => normalizeQuickMathProgress(quickMathProgress), [quickMathProgress]);

  useEffect(() => {
    let active = true;

    async function loadCommunity() {
      if (!supabase) {
        if (active) setCommunity({ status: "unavailable", data: null, error: "Connect Supabase to see live platform stats and the leaderboard." });
        return;
      }

      setCommunity({ status: "loading", data: null, error: "" });
      const { data, error } = await supabase.rpc("get_community_dashboard");
      if (!active) return;
      if (error) {
        setCommunity({
          status: "error",
          data: null,
          error: "Community data is not available yet. Run supabase/community-stats.sql in your Supabase project, then refresh this page.",
        });
        return;
      }
      setCommunity({ status: "ready", data: normalizeCommunityDashboard(data), error: "" });
    }

    loadCommunity();
    return () => { active = false; };
  }, []);

  const personalCards = [
    { icon: ClipboardCheck, label: "Mocks logged", value: numberFormatter.format(personal.totalMocks), note: "all time", accent: COLORS.info },
    { icon: Flame, label: "Mocks in last 30 days", value: numberFormatter.format(personal.mocksLast30Days), note: "your recent logging rhythm", accent: COLORS.varc },
    { icon: Trophy, label: "Best score", value: score(personal.bestScore), note: personal.scoredMockCount ? `from ${personal.scoredMockCount} scored mock${personal.scoredMockCount === 1 ? "" : "s"}` : "log scores to track your best", accent: COLORS.warn },
    { icon: Target, label: "Latest percentile", value: personal.latestPercentile === null ? "—" : `${fmtNum(personal.latestPercentile, 2)}%ile`, note: personal.latestPercentile === null ? "add a percentile when logging a mock" : "from your most recent percentile", accent: COLORS.primary },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <Card className="overflow-hidden relative">
        <div aria-hidden="true" className="absolute" style={{ width: 210, height: 210, borderRadius: "50%", right: -74, top: -106, background: `${COLORS.primary}14` }} />
        <div className="relative flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2" style={{ color: COLORS.primary }}>
              <UsersRound size={17} />
              <span style={TYPE.label}>Odyssey community</span>
            </div>
            <h1 className="mt-3" style={{ ...TYPE.pageTitle, fontSize: 28 }}>Your prep, in context.</h1>
            <p className="mt-2 text-sm leading-6" style={{ color: COLORS.inkMuted }}>
              Track your own momentum, see the month’s most consistent mock-loggers, and follow Odyssey’s real-time growth.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 text-xs shrink-0" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.inkMuted }}>
            <BarChart3 size={14} style={{ color: COLORS.info }} />
            Live from Odyssey
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-3">
          <h2 style={TYPE.panelTitle}>Your stats</h2>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>These update as soon as you log a mock.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {personalCards.map((card) => <StatCard key={card.label} {...card} />)}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-4 items-start">
        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={17} style={{ color: COLORS.warn }} />
                <h2 style={TYPE.panelTitle}>Monthly mock leaderboard</h2>
              </div>
              <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>Ranked by mocks logged in the last 30 days. Latest score breaks a tie.</p>
            </div>
            <span className="px-2.5 py-1 text-xs shrink-0" style={{ borderRadius: 999, background: COLORS.warnSoft, color: COLORS.warn, fontWeight: 700 }}>Last 30 days</span>
          </div>

          {community.status === "loading" && <CommunityLoading />}
          {community.status === "unavailable" && <CommunityUnavailable message={community.error} />}
          {community.status === "error" && <CommunityUnavailable message={community.error} />}
          {community.status === "ready" && (
            <div className="mt-5 overflow-hidden" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              {community.data.leaderboard.map((entry, index) => (
                <div key={`${entry.rank}-${entry.username}`} className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-4 py-3" style={index ? { borderTop: `1px solid ${COLORS.border}` } : undefined}>
                  <span className="grid place-items-center text-xs" style={{ width: 26, height: 26, borderRadius: 8, background: entry.rank <= 3 ? COLORS.warnSoft : COLORS.surface2, color: entry.rank <= 3 ? COLORS.warn : COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>#{entry.rank}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: COLORS.ink, fontWeight: 600 }}>@{entry.username}</p>
                    <p className="mt-0.5 text-xs" style={{ color: COLORS.inkMuted }}>{entry.latestScore === null ? "No score shared" : `Latest score: ${score(entry.latestScore)}`}</p>
                  </div>
                  <span className="text-right text-sm" style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{entry.mockCount} <span className="text-xs" style={{ color: COLORS.inkMuted, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>mocks</span></span>
                </div>
              ))}
              {!community.data.leaderboard.length && <p className="px-4 py-8 text-center text-sm" style={{ color: COLORS.inkMuted }}>No community members have logged a mock in the last 30 days yet.</p>}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <UsersRound size={17} style={{ color: COLORS.primary }} />
            <h2 style={TYPE.panelTitle}>Odyssey by the numbers</h2>
          </div>
          <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>Live totals across every signed-up learner.</p>
          {community.status === "loading" && <CommunityLoading />}
          {(community.status === "unavailable" || community.status === "error") && <CommunityUnavailable message={community.error} />}
          {community.status === "ready" && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="p-4" style={{ background: COLORS.surface2, borderRadius: 10 }}><UsersRound size={16} style={{ color: COLORS.primary }} /><strong className="block mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: COLORS.ink }}>{numberFormatter.format(community.data.totalStudents)}</strong><p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>students on Odyssey</p></div>
              <div className="p-4" style={{ background: COLORS.surface2, borderRadius: 10 }}><ClipboardCheck size={16} style={{ color: COLORS.info }} /><strong className="block mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: COLORS.ink }}>{numberFormatter.format(community.data.totalMocks)}</strong><p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>mocks logged</p></div>
              <div className="p-4" style={{ background: COLORS.surface2, borderRadius: 10 }}><Flame size={16} style={{ color: COLORS.varc }} /><strong className="block mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: COLORS.ink }}>{numberFormatter.format(community.data.mocksLast30Days)}</strong><p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>logged this month</p></div>
              <div className="p-4" style={{ background: COLORS.surface2, borderRadius: 10 }}><Sparkles size={16} style={{ color: COLORS.good }} /><strong className="block mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: COLORS.ink }}>{numberFormatter.format(community.data.activeLearners)}</strong><p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>active mock-loggers</p></div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2"><Target size={17} style={{ color: COLORS.primary }} /><h2 style={TYPE.panelTitle}>Your preparation snapshot</h2></div>
        <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>A few signals alongside your mock history.</p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.surface2 }}>
            <div className="flex items-center gap-2"><BookOpenCheck size={15} style={{ color: COLORS.dilr }} /><span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Syllabus coverage</span></div>
            <p className="mt-3 text-sm" style={{ color: COLORS.ink }}><strong>{syllabusStats.overall.percent}% complete</strong></p>
            <p className="mt-2 text-xs leading-5" style={{ color: COLORS.inkMuted }}>Keep marking completed topics to make your study coverage visible.</p>
          </div>
          <div className="p-4" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.surface2 }}>
            <div className="flex items-center gap-2"><Sparkles size={15} style={{ color: COLORS.warn }} /><span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Quick Math</span></div>
            <p className="mt-3 text-sm" style={{ color: COLORS.ink }}><strong>{quickMath.totalAnswered || 0} answers</strong> · {quickMath.currentStreak ? `${quickMath.currentStreak}-day streak` : "start your first streak"}</p>
            <p className="mt-2 text-xs leading-5" style={{ color: COLORS.inkMuted }}>Small daily practice compounds between mocks.</p>
          </div>
          <div className="p-4" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, background: COLORS.surface2 }}>
            <div className="flex items-center gap-2"><ClipboardCheck size={15} style={{ color: COLORS.info }} /><span style={{ ...TYPE.label, color: COLORS.inkMuted }}>Scored mock coverage</span></div>
            <p className="mt-3 text-sm" style={{ color: COLORS.ink }}><strong>{personal.scoredMockCount} of {personal.totalMocks} mocks scored</strong></p>
            <p className="mt-2 text-xs leading-5" style={{ color: COLORS.inkMuted }}>Scores power your best-score and trend insights.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 style={TYPE.panelTitle}>Leaderboard participation</h2>
            <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>Only Community accounts appear using their username and aggregate mock activity.</p>
          </div>
          <span className="px-2.5 py-1 text-xs" style={{ borderRadius: 999, background: COLORS.surface2, color: COLORS.inkMuted, fontWeight: 700 }}>{accountType === "personal" ? "Personal" : "Community"}</span>
        </div>
        <div className="mt-4 max-w-3xl"><AccountTypeSelector value={accountType} onChange={onUpdateAccountType} compact /></div>
      </Card>

      <p className="px-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>
        Platform totals are aggregated. Leaderboard visibility is opt-in through the Community account setting; private accounts never appear there.
      </p>
    </div>
  );
}
