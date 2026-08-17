import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleDot, LineChart, Target, UserRound } from "lucide-react";
import { COLORS, SECTION_META, SHADOW, TYPE } from "../constants";
import { FieldLabel, inputStyle, selectStyle } from "./ui/FieldLabel";

const slides = [
  {
    eyebrow: "Your prep, in one view",
    title: "Know what every mock is telling you.",
    text: "Odyssey tracks VARC, DILR, and Quant separately, then puts every mock on a timeline so patterns are easy to spot.",
    icon: LineChart,
    shortTitle: "Your prep",
  },
  {
    eyebrow: "More useful signals",
    title: "Accuracy and attempts are different problems.",
    text: "You can be accurate but leave marks on the table, or attempt more than your accuracy can support. Odyssey keeps both signals separate—and distinguishes MCQs from TITA questions—so your next adjustment is specific.",
    icon: Target,
    shortTitle: "Find signals",
  },
  {
    eyebrow: "Ready when you are",
    title: "Welcome to a more intentional prep cycle.",
    text: "Log a mock, look for one signal worth acting on, and carry that lesson into the next test.",
    icon: CheckCircle2,
    shortTitle: "Set up profile",
  },
];

export default function Onboarding({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    displayName: "",
    username: "",
    catTargetYear: String(new Date().getFullYear()),
  });
  const slide = slides[index];
  const Icon = slide.icon;
  const targetYears = Array.from({ length: 6 }, (_, offset) => new Date().getFullYear() + offset);
  const isProfileStep = index === slides.length - 1;

  const setProfileField = (field) => (event) => {
    const value = field === "username"
      ? event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
      : event.target.value;
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await onComplete(profile);
    } catch (err) {
      setError(err.message || "Could not save your onboarding choice. Please try again.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-8" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-xl border lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)] sm:min-h-[calc(100vh-4rem)]" style={{ background: COLORS.surface, borderColor: COLORS.border, boxShadow: SHADOW.card }}>
        <aside className="flex flex-col border-b p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
          <Brand />

          <div className="mt-7 flex items-center gap-3 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold" style={{ background: COLORS.primary, color: COLORS.onPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>
              {index + 1}
            </div>
            <div>
              <p style={{ ...TYPE.label, color: COLORS.inkMuted }}>Getting started</p>
              <p className="mt-0.5 text-sm font-semibold">{slide.shortTitle}</p>
            </div>
            <span className="ml-auto text-xs" style={{ color: COLORS.inkMuted }}>Step {index + 1} of {slides.length}</span>
          </div>

          <ol className="mt-12 hidden gap-2 lg:grid" aria-label="Onboarding progress">
            {slides.map((item, stepIndex) => <StepItem key={item.shortTitle} item={item} stepIndex={stepIndex} activeIndex={index} />)}
          </ol>

          <div className="mt-auto hidden rounded-lg border p-4 lg:block" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
            <p style={{ ...TYPE.label, color: COLORS.inkMuted }}>A clear next move</p>
            <p className="mt-2 text-sm leading-5" style={{ color: COLORS.inkMuted }}>Every screen is designed to help you turn your latest mock into an actionable adjustment.</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <span className="hidden text-sm font-semibold lg:block" style={{ color: COLORS.inkMuted }}>Set up your workspace</span>
            <span className="hidden text-sm font-semibold lg:block" style={{ color: COLORS.inkMuted }}>Step {index + 1} of {slides.length}</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full lg:hidden" style={{ background: COLORS.border }} aria-label={`Step ${index + 1} of ${slides.length}`}>
              <div className="h-full rounded-full transition-all" style={{ width: `${((index + 1) / slides.length) * 100}%`, background: COLORS.primary }} />
            </div>
          </div>

          <div className="my-auto py-10 sm:py-14 lg:py-10">
            <div className="grid h-12 w-12 place-items-center rounded-lg border" style={{ background: COLORS.primary + "18", borderColor: COLORS.primary + "35", color: COLORS.primary }}>
              <Icon size={22} />
            </div>
            <p className="mt-7" style={{ ...TYPE.label, color: COLORS.primary }}>{slide.eyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{slide.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8" style={{ color: COLORS.inkMuted }}>{slide.text}</p>

            {index === 0 && <SectionPreview />}
            {index === 1 && <SignalPreview />}
            {isProfileStep && <ProfileFields profile={profile} setProfileField={setProfileField} targetYears={targetYears} />}
          </div>

          {error && <p role="alert" className="mb-5 rounded-lg border px-3 py-2.5 text-sm" style={{ color: COLORS.danger, background: COLORS.dangerSoft, borderColor: COLORS.danger }}>{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
            <div className="flex gap-1.5" aria-label={`Step ${index + 1} of ${slides.length}`}>
              {slides.map((_, dotIndex) => <span key={dotIndex} className="h-1.5 rounded-full transition-all" style={{ width: index === dotIndex ? 20 : 6, background: index === dotIndex ? COLORS.primary : COLORS.border }} />)}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              {index > 0 && <button type="button" onClick={() => setIndex((current) => current - 1)} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ borderRadius: 8, color: COLORS.ink }}><ArrowLeft size={16} /> Back</button>}
              <button type="button" onClick={isProfileStep ? finish : () => setIndex((current) => current + 1)} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
                {busy ? "Saving…" : isProfileStep ? "Get started" : "Continue"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return <div className="flex items-center gap-2.5">
    <OdysseyMark />
    <div>
      <p style={TYPE.pageTitle}>Odyssey</p>
      <p className="text-xs" style={{ color: COLORS.inkMuted }}>CAT Mock Tracker</p>
    </div>
  </div>;
}

function OdysseyMark() {
  return <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="0" y="0" width="32" height="32" rx="7" fill={COLORS.primary} />
    <circle cx="16" cy="16" r="8" fill="none" stroke={COLORS.onPrimary} strokeWidth="4.5" />
    <circle cx="21.66" cy="10.34" r="3.2" fill={COLORS.warn} />
  </svg>;
}

function StepItem({ item, stepIndex, activeIndex }) {
  const complete = stepIndex < activeIndex;
  const active = stepIndex === activeIndex;
  return <li className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: active ? COLORS.surface : "transparent" }}>
    <span className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold" style={{ background: complete || active ? COLORS.primary : COLORS.surface, border: complete || active ? "none" : `1px solid ${COLORS.border}`, color: complete || active ? COLORS.onPrimary : COLORS.inkMuted }}>
      {complete ? <Check size={14} /> : stepIndex + 1}
    </span>
    <span className="text-sm font-semibold" style={{ color: active ? COLORS.ink : COLORS.inkMuted }}>{item.shortTitle}</span>
  </li>;
}

function SectionPreview() {
  return <div className="mt-8 grid gap-3 sm:grid-cols-3">
    {["VARC", "DILR", "Quant"].map((section) => {
      const meta = SECTION_META[section];
      return <div key={section} className="rounded-lg border p-4" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
        <span className="inline-flex h-7 items-center rounded-md px-2 text-xs font-bold" style={{ background: meta.soft, color: meta.color }}>{section}</span>
        <p className="mt-4 text-sm font-semibold">Sectional view</p>
        <p className="mt-1 text-xs leading-5" style={{ color: COLORS.inkMuted }}>Track the details behind your score.</p>
      </div>;
    })}
  </div>;
}

function SignalPreview() {
  const signals = [
    ["Accuracy", "How often your attempts convert", "88%", COLORS.good],
    ["Attempt rate", "How much of the paper you use", "67%", COLORS.primary],
    ["Question mix", "MCQ and TITA, kept distinct", "2 types", COLORS.quant],
  ];
  return <div className="mt-8 grid gap-3 sm:grid-cols-3">
    {signals.map(([label, text, value, color]) => <div key={label} className="rounded-lg border p-4" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
      <p style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</p>
      <p className="mt-2 text-xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</p>
      <p className="mt-2 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{text}</p>
    </div>)}
  </div>;
}

function ProfileFields({ profile, setProfileField, targetYears }) {
  return <div className="mt-8 rounded-xl border p-4 sm:p-5" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: COLORS.primary, background: COLORS.primary + "18" }}><UserRound size={16} /></div>
      <div>
        <h2 style={TYPE.panelTitle}>A few details to get started</h2>
        <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>This personalizes your workspace and profile.</p>
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FieldLabel htmlFor="onboarding-name">Your name</FieldLabel>
        <input id="onboarding-name" autoComplete="name" maxLength={80} required value={profile.displayName} onChange={setProfileField("displayName")} placeholder="e.g. Aditi Sharma" style={inputStyle()} />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-username">Unique username</FieldLabel>
        <input id="onboarding-username" autoComplete="username" minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" required value={profile.username} onChange={setProfileField("username")} placeholder="e.g. aditi_cat26" style={inputStyle()} />
        <span className="text-xs leading-5" style={{ color: COLORS.inkMuted }}>3–24 lowercase letters, numbers, or underscores.</span>
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-target-year">CAT target year</FieldLabel>
        <select id="onboarding-target-year" value={profile.catTargetYear} onChange={setProfileField("catTargetYear")} style={selectStyle()}>
          {targetYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
    </div>
  </div>;
}
