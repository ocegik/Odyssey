import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Grid3X3, LineChart, Target } from "lucide-react";
import { COLORS } from "../constants";

const slides = [
  {
    eyebrow: "Your prep, in one view",
    title: "Know what every mock is telling you.",
    text: "Odyssey tracks VARC, DILR, and Quant separately, then puts every mock on a timeline so patterns are easy to spot.",
    icon: LineChart,
  },
  {
    eyebrow: "More useful signals",
    title: "Accuracy and attempts are different problems.",
    text: "You can be accurate but leave marks on the table, or attempt more than your accuracy can support. Odyssey keeps both signals separate—and distinguishes MCQs from TITA questions—so your next adjustment is specific.",
    icon: Target,
  },
  {
    eyebrow: "Ready when you are",
    title: "Welcome to a more intentional prep cycle.",
    text: "Log a mock, look for one signal worth acting on, and carry that lesson into the next test.",
    icon: CheckCircle2,
  },
];

export default function Onboarding({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slide = slides[index];
  const Icon = slide.icon;

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await onComplete();
    } catch (err) {
      setError(err.message || "Could not save your onboarding choice. Please try again.");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-6 sm:p-8" style={{ background: COLORS.bg, color: COLORS.ink }}>
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-lg" style={{ background: COLORS.surface, borderColor: COLORS.border, boxShadow: "var(--shadow-floating)" }}>
        <div className="h-1.5" style={{ background: COLORS.border }}><div className="h-full transition-all" style={{ width: `${((index + 1) / slides.length) * 100}%`, background: COLORS.primary }} /></div>
        <div className="p-6 sm:p-10">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}><Grid3X3 size={16} /> Odyssey</div>
            <button type="button" onClick={finish} disabled={busy} className="text-sm font-semibold underline underline-offset-4 disabled:opacity-60" style={{ color: COLORS.inkMuted }}>Skip setup</button>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: COLORS.primary + "18", color: COLORS.primary }}><Icon size={25} /></div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-widest" style={{ color: COLORS.primary }}>{slide.eyebrow}</p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{slide.title}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: COLORS.inkMuted }}>{slide.text}</p>
          {index === 0 && <div className="mt-8 grid grid-cols-3 gap-3"><Pill label="VARC" /><Pill label="DILR" /><Pill label="Quant" /></div>}
          {index === 1 && <div className="mt-8 flex flex-wrap gap-2"><Pill label="Accuracy" /><Pill label="Attempt rate" /><Pill label="MCQ vs TITA" /></div>}
          {error && <p role="alert" className="mt-6 text-sm" style={{ color: COLORS.danger }}>{error}</p>}
          <div className="mt-12 flex items-center justify-between gap-3">
            <div className="flex gap-2" aria-label={`Step ${index + 1} of ${slides.length}`}>{slides.map((_, dotIndex) => <CircleDot key={dotIndex} size={index === dotIndex ? 17 : 14} style={{ color: index === dotIndex ? COLORS.primary : COLORS.border }} />)}</div>
            <div className="flex items-center gap-2">
              {index > 0 && <button type="button" onClick={() => setIndex((current) => current - 1)} disabled={busy} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ borderColor: COLORS.border, color: COLORS.ink }}><ArrowLeft size={16} /> Back</button>}
              <button type="button" onClick={index === slides.length - 1 ? finish : () => setIndex((current) => current + 1)} disabled={busy} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
                {busy ? "Saving…" : index === slides.length - 1 ? "Get started" : "Continue"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Pill({ label }) {
  return <span className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: COLORS.border, background: COLORS.surface2, color: COLORS.ink }}>{label}</span>;
}
