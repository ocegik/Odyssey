import { useState } from "react";
import { Check, ArrowRight, RotateCcw } from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../../constants";

const TOPICS = {
  tables: {
    label: "Times Tables",
    generate() {
      const a = Math.floor(Math.random() * 19) + 2;
      const b = Math.floor(Math.random() * 12) + 2;
      return {
        text: `${a} × ${b}`,
        answer: a * b,
      };
    },
  },
  squares: {
    label: "Squares",
    generate() {
      const n = Math.floor(Math.random() * 25) + 2;
      return {
        text: `${n}²`,
        answer: n * n,
      };
    },
  },
  percentages: {
    label: "Percentages",
    generate() {
      const percentages = [10, 20, 25, 50, 75];
      const percentage =
        percentages[Math.floor(Math.random() * percentages.length)];
      const base = (Math.floor(Math.random() * 10) + 1) * 10;

      return {
        text: `${percentage}% of ${base}`,
        answer: (percentage / 100) * base,
      };
    },
  },
};

function makeQuestion(topic) {
  return TOPICS[topic].generate();
}

export default function QuickMath() {
  const [topic, setTopic] = useState("tables");
  const [question, setQuestion] = useState(() => makeQuestion("tables"));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const startQuestion = (nextTopic = topic) => {
    setTopic(nextTopic);
    setQuestion(makeQuestion(nextTopic));
    setAnswer("");
    setFeedback(null);
  };

  const checkAnswer = () => {
    if (answer.trim() === "" || feedback) return;

    const userAnswer = Number(answer);
    const isCorrect =
      Number.isFinite(userAnswer) &&
      Math.abs(userAnswer - question.answer) < 0.000001;

    setFeedback({
      correct: isCorrect,
      correctAnswer: question.answer,
    });

    setScore((current) => ({
      correct: current.correct + (isCorrect ? 1 : 0),
      total: current.total + 1,
    }));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      checkAnswer();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>
          Quick practice
        </div>
        <h1 className="mt-1" style={TYPE.pageTitle}>
          Quick Math
        </h1>
        <p
          className="mt-2 text-sm leading-6"
          style={{ color: COLORS.inkMuted, maxWidth: 560 }}
        >
          Short calculation drills to build speed and accuracy.
        </p>
      </div>

      <div
        className="p-5 sm:p-6"
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          boxShadow: SHADOW.card,
        }}
      >
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(TOPICS).map(([key, item]) => {
            const active = topic === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => startQuestion(key)}
                className="px-3 py-2 text-sm"
                style={{
                  borderRadius: 8,
                  border: `1px solid ${
                    active ? COLORS.primary : COLORS.border
                  }`,
                  background: active ? COLORS.primary : COLORS.surface2,
                  color: active ? COLORS.onPrimary : COLORS.inkMuted,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          className="flex flex-col items-center text-center py-8 sm:py-12"
          style={{ borderTop: `1px solid ${COLORS.border}` }}
        >
          <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>
            {TOPICS[topic].label}
          </div>

          <div
            className="mt-5"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: "clamp(32px, 8vw, 52px)",
              color: COLORS.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {question.text}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 w-full">
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleKeyDown}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Answer"
              disabled={Boolean(feedback)}
              className="w-full max-w-xs text-center px-4 py-3 text-lg"
              style={{
                background: COLORS.surface2,
                border: `1px solid ${
                  feedback
                    ? feedback.correct
                      ? COLORS.good
                      : COLORS.danger
                    : COLORS.border
                }`,
                borderRadius: 9,
                color: COLORS.ink,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
              }}
            />

            {!feedback ? (
              <button
                type="button"
                onClick={checkAnswer}
                disabled={answer.trim() === ""}
                className="flex items-center gap-2 px-4 py-2.5 text-sm"
                style={{
                  marginTop: 4,
                  borderRadius: 8,
                  background:
                    answer.trim() === "" ? COLORS.surface2 : COLORS.primary,
                  color:
                    answer.trim() === "" ? COLORS.inkMuted : COLORS.onPrimary,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                }}
              >
                Check answer
                <Check size={15} />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 mt-2">
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{
                    color: feedback.correct ? COLORS.good : COLORS.danger,
                    fontWeight: 600,
                  }}
                >
                  {feedback.correct ? (
                    <>
                      <Check size={16} />
                      Correct
                    </>
                  ) : (
                    <>
                      Incorrect · answer:{" "}
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {feedback.correctAnswer}
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => startQuestion()}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm"
                  style={{
                    borderRadius: 8,
                    background: COLORS.primary,
                    color: COLORS.onPrimary,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Next question
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-4 p-4"
        style={{
          background: COLORS.surface2,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
        }}
      >
        <div>
          <div style={{ ...TYPE.label, color: COLORS.inkMuted }}>
            Session score
          </div>
          <div
            className="mt-1 text-sm"
            style={{
              color: COLORS.ink,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            {score.correct} / {score.total}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setScore({ correct: 0, total: 0 });
            startQuestion();
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm"
          style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.inkMuted,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
    </div>
  );
}
