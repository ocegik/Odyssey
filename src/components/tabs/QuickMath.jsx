import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Flame,
  Lock,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../../constants";
import {
  QUICK_MATH_LEVELS,
  accuracy,
  emptyQuickMathProgress,
  formatDuration,
  getLevelProgress,
  isLevelUnlocked,
  levelUnlockMessage,
  makeQuickMathQuestion,
  normalizeQuickMathProgress,
} from "../../lib/quickMath";
import { createListShareImage, SHARE_COLORS } from "../../lib/shareImage";
import ShareImageButton from "../ui/ShareImageButton";

function Stat({ label, value, icon: Icon }) {
  return (
    <div
      className="p-3 sm:p-4"
      style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}
    >
      <div className="flex items-center gap-1.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <div className="mt-1.5" style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}

export default function QuickMath({ progress: rawProgress, onRecordResult, studentName }) {
  const progress = normalizeQuickMathProgress(rawProgress || emptyQuickMathProgress());
  const [levelId, setLevelId] = useState("foundation");
  const [question, setQuestion] = useState(() => makeQuickMathQuestion("foundation"));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const questionStartedAt = useRef(Date.now());

  const activeLevel = QUICK_MATH_LEVELS.find((level) => level.id === levelId) || QUICK_MATH_LEVELS[0];
  const activeLevelProgress = getLevelProgress(progress, levelId);

  // A new unlock can arrive after answering; keep the selected level valid if
  // progress is restored from an older account that had a now-locked level.
  useEffect(() => {
    if (!isLevelUnlocked(progress, levelId)) {
      setLevelId("foundation");
      setQuestion(makeQuickMathQuestion("foundation"));
      setAnswer("");
      setFeedback(null);
      questionStartedAt.current = Date.now();
    }
  }, [levelId, progress]);

  const startQuestion = (nextLevelId = levelId) => {
    setLevelId(nextLevelId);
    setQuestion(makeQuickMathQuestion(nextLevelId));
    setAnswer("");
    setFeedback(null);
    questionStartedAt.current = Date.now();
  };

  const selectLevel = (nextLevelId) => {
    if (!isLevelUnlocked(progress, nextLevelId)) return;
    startQuestion(nextLevelId);
  };

  const checkAnswer = () => {
    if (answer.trim() === "" || feedback) return;
    const userAnswer = Number(answer);
    const correct = Number.isFinite(userAnswer) && Math.abs(userAnswer - question.answer) < 0.000001;
    const elapsedMs = Date.now() - questionStartedAt.current;

    setFeedback({ correct, correctAnswer: question.answer, elapsedMs });
    setSession((current) => ({ correct: current.correct + (correct ? 1 : 0), total: current.total + 1 }));
    onRecordResult?.({ levelId, correct, elapsedMs });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") checkAnswer();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div><div style={{ ...TYPE.label, color: COLORS.inkMuted }}>Practice</div><h1 className="mt-1" style={TYPE.pageTitle}>Quick Math</h1></div>
        <ShareImageButton createImage={() => createListShareImage({ title: "Quick Math Results", studentName, subtitle: activeLevel.label, items: [{ label: "Practice XP", text: progress.xp, color: SHARE_COLORS.primary }, { label: "Accuracy", text: `${accuracy(progress.correct, progress.totalAnswered)}%`, color: SHARE_COLORS.dilr }, { label: "Best streak", text: progress.bestStreak, color: SHARE_COLORS.primary }, { label: "Questions solved", text: progress.totalAnswered, color: SHARE_COLORS.quant }], filename: "odyssey-quick-math-results.png" })} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Practice XP" value={progress.xp} icon={Sparkles} />
        <Stat label="Accuracy" value={`${accuracy(progress.correct, progress.totalAnswered)}%`} icon={Trophy} />
        <Stat label="Best streak" value={progress.bestStreak} icon={Flame} />
        <Stat label="Questions solved" value={progress.totalAnswered} icon={Check} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {QUICK_MATH_LEVELS.map((level) => {
          const unlocked = isLevelUnlocked(progress, level.id);
          const selected = levelId === level.id;
          const levelProgress = getLevelProgress(progress, level.id);
          const previousLevel = level.unlockAfter ? getLevelProgress(progress, level.unlockAfter) : null;
          const completion = level.unlockAfter ? Math.min(100, Math.round((previousLevel.correct / level.unlockAt) * 100)) : 100;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => selectLevel(level.id)}
              disabled={!unlocked}
              className="text-left p-4"
              style={{
                background: selected ? COLORS.primary : COLORS.surface,
                color: selected ? COLORS.onPrimary : COLORS.ink,
                border: `1px solid ${selected ? COLORS.primary : COLORS.border}`,
                borderRadius: 11,
                boxShadow: selected ? SHADOW.card : "none",
                opacity: unlocked ? 1 : 0.7,
                cursor: unlocked ? "pointer" : "not-allowed",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span style={{ ...TYPE.panelTitle, color: selected ? COLORS.onPrimary : COLORS.ink }}>{level.label}</span>
                {!unlocked && <Lock size={16} />}
              </div>
              <p className="mt-1 text-sm leading-5" style={{ color: selected ? COLORS.onPrimary : COLORS.inkMuted }}>{level.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: selected ? COLORS.onPrimary : COLORS.inkMuted }}>
                <span>{unlocked ? `${levelProgress.correct} correct` : levelUnlockMessage(progress, level.id)}</span>
                {level.unlockAfter && <span>{completion}%</span>}
              </div>
              {level.unlockAfter && (
                <div className="mt-2 h-1.5 overflow-hidden" style={{ background: selected ? "rgba(255,255,255,0.28)" : COLORS.surface2, borderRadius: 999 }}>
                  <div style={{ width: `${completion}%`, height: "100%", background: selected ? COLORS.onPrimary : COLORS.primary, borderRadius: 999 }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div
          className="p-5 sm:p-6"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}
        >
          <div className="flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 18 }}>
            <div>
              <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>{activeLevel.label} drill</div>
              <div className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>{activeLevel.description}</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: COLORS.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>
              <Timer size={14} /> {activeLevelProgress.total ? `Avg ${formatDuration(activeLevelProgress.totalTimeMs / activeLevelProgress.total)}` : "Untimed"}
            </div>
          </div>

          <div className="flex flex-col items-center text-center py-8 sm:py-11">
            <div className="mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "clamp(30px, 7vw, 50px)", color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>
              {question.text}
            </div>
            <p className="mt-3 text-xs" style={{ color: COLORS.inkMuted }}>Enter your answer and press Enter to check.</p>

            <div className="mt-7 flex flex-col items-center gap-3 w-full">
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                inputMode="decimal"
                autoComplete="off"
                aria-label="Your answer"
                placeholder="Answer"
                disabled={Boolean(feedback)}
                className="w-full max-w-xs text-center px-4 py-3 text-lg"
                style={{
                  background: COLORS.surface2,
                  border: `1px solid ${feedback ? (feedback.correct ? COLORS.good : COLORS.danger) : COLORS.border}`,
                  borderRadius: 9, color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", outline: "none",
                }}
              />

              {!feedback ? (
                <button type="button" onClick={checkAnswer} disabled={answer.trim() === ""} className="flex items-center gap-2 px-4 py-2.5 text-sm" style={{ marginTop: 4, borderRadius: 8, background: answer.trim() === "" ? COLORS.surface2 : COLORS.primary, color: answer.trim() === "" ? COLORS.inkMuted : COLORS.onPrimary, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  Check answer <Check size={15} />
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 mt-2">
                  <div className="text-sm" style={{ color: feedback.correct ? COLORS.good : COLORS.danger, fontWeight: 600 }}>
                    {feedback.correct ? <span className="inline-flex items-center gap-2"><Check size={16} /> Correct · +10 XP</span> : <span className="inline-flex items-center gap-2"><X size={16} /> Answer: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{feedback.correctAnswer}</span></span>}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.inkMuted }}>
                    {feedback.correct ? `Solved in ${formatDuration(feedback.elapsedMs)}.` : question.hint}
                  </div>
                  <button type="button" onClick={() => startQuestion()} className="flex items-center gap-2 px-4 py-2.5 text-sm" style={{ borderRadius: 8, background: COLORS.primary, color: COLORS.onPrimary, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                    Next question <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="p-5 flex flex-col gap-5" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
          <div>
            <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>Current run</div>
            <div className="mt-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 26, color: COLORS.ink }}>{session.correct} / {session.total}</div>
            <div className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>{session.total ? `${accuracy(session.correct, session.total)}% this session` : "Start with a question"}</div>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
          <div>
            <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>Account streak</div>
            <div className="mt-2 flex items-center gap-2" style={{ color: COLORS.ink, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22 }}><Flame size={20} color={COLORS.warn} /> {progress.currentStreak}</div>
            <p className="mt-1 text-sm leading-5" style={{ color: COLORS.inkMuted }}>Best: {progress.bestStreak} consecutive correct answers.</p>
          </div>
          <button type="button" onClick={() => { setSession({ correct: 0, total: 0 }); startQuestion(); }} className="mt-auto flex items-center justify-center gap-1.5 px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            <RotateCcw size={14} /> Reset session
          </button>
        </aside>
      </div>
    </div>
  );
}
