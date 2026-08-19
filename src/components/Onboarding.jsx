import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, LineChart, Target, UserRound } from "lucide-react";
import { COLORS, SECTION_META, SHADOW, TYPE } from "../constants";
import { FieldLabel, inputStyle, selectStyle } from "./ui/FieldLabel";
import { CURRENT_STATUS_OPTIONS, GENDER_OPTIONS, TEST_SERIES_OPTIONS } from "../hooks/useSettings";
import { catExamDateForYear, fmtDateLong } from "../lib/dateMath";

const slides = [
  {
    eyebrow: "CAT mock tracker",
    title: "Make every mock count.",
    text: "Track your progress across VARC, DILR, and Quant.",
    icon: LineChart,
    shortTitle: "Welcome",
  },
  {
    eyebrow: "Set your timeline",
    title: "Plan your CAT preparation.",
    text: "Set your target year and preparation start date.",
    icon: Target,
    shortTitle: "Your plan",
  },
  {
    eyebrow: "Personalize",
    title: "Add your preferences.",
    text: "Optional details you can update anytime.",
    icon: CheckCircle2,
    shortTitle: "Personalize",
  },
];

export default function Onboarding({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    displayName: "",
    age: "",
    catTargetYear: String(new Date().getFullYear()),
    preparationStartDate: "",
    testSeries: [],
    gender: "",
    currentStatus: "",
  });
  const slide = slides[index];
  const Icon = slide.icon;
  const targetYears = Array.from({ length: 6 }, (_, offset) => new Date().getFullYear() + offset);
  const isEssentialStep = index === 1;
  const isPersonalizationStep = index === slides.length - 1;

  const setProfileField = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const toggleTestSeries = (series) => {
    setProfile((current) => ({
      ...current,
      testSeries: current.testSeries.includes(series)
        ? current.testSeries.filter((item) => item !== series)
        : [...current.testSeries, series],
    }));
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
            {isEssentialStep && <><SignalPreview /><EssentialFields profile={profile} setProfileField={setProfileField} targetYears={targetYears} /></>}
            {isPersonalizationStep && <PersonalizationFields profile={profile} setProfileField={setProfileField} toggleTestSeries={toggleTestSeries} />}
          </div>

          {error && <p role="alert" className="mb-5 rounded-lg border px-3 py-2.5 text-sm" style={{ color: COLORS.danger, background: COLORS.dangerSoft, borderColor: COLORS.danger }}>{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
            <div className="flex gap-1.5" aria-label={`Step ${index + 1} of ${slides.length}`}>
              {slides.map((_, dotIndex) => <span key={dotIndex} className="h-1.5 rounded-full transition-all" style={{ width: index === dotIndex ? 20 : 6, background: index === dotIndex ? COLORS.primary : COLORS.border }} />)}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              {index > 0 && <button type="button" onClick={() => setIndex((current) => current - 1)} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ borderRadius: 8, color: COLORS.ink }}><ArrowLeft size={16} /> Back</button>}
              <button type="button" onClick={isPersonalizationStep ? finish : () => setIndex((current) => current + 1)} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: COLORS.primary, color: COLORS.onPrimary, borderRadius: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
                {busy ? "Saving…" : isPersonalizationStep ? "Get started" : "Continue"} <ArrowRight size={16} />
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
      </div>;
    })}
  </div>;
}

function SignalPreview() {
  const signals = [
    ["Accuracy", "Correct attempts", "88%", COLORS.good],
    ["Attempt rate", "Questions attempted", "67%", COLORS.primary],
    ["Question mix", "MCQ and TITA", "2 types", COLORS.quant],
  ];
  return <div className="mt-8 grid gap-3 sm:grid-cols-3">
    {signals.map(([label, text, value, color]) => <div key={label} className="rounded-lg border p-4" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
      <p style={{ ...TYPE.label, color: COLORS.inkMuted }}>{label}</p>
      <p className="mt-2 text-xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</p>
      <p className="mt-2 text-xs leading-5" style={{ color: COLORS.inkMuted }}>{text}</p>
    </div>)}
  </div>;
}

function EssentialFields({ profile, setProfileField, targetYears }) {
  const catExamDate = catExamDateForYear(profile.catTargetYear);
  return <div className="mt-8 rounded-xl border p-4 sm:p-5" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: COLORS.primary, background: COLORS.primary + "18" }}><CalendarDays size={16} /></div>
      <div>
        <h2 style={TYPE.panelTitle}>Your plan</h2>
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FieldLabel htmlFor="onboarding-name">Your name</FieldLabel>
        <input id="onboarding-name" autoComplete="name" maxLength={80} required value={profile.displayName} onChange={setProfileField("displayName")} placeholder="e.g. Aditi Sharma" style={inputStyle()} />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-target-year">CAT target year</FieldLabel>
        <select id="onboarding-target-year" value={profile.catTargetYear} onChange={setProfileField("catTargetYear")} style={selectStyle()}>
          {targetYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-exam-date">CAT exam date</FieldLabel>
        <input id="onboarding-exam-date" value={fmtDateLong(catExamDate)} readOnly style={inputStyle()} />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-preparation-start">Preparation start date</FieldLabel>
        <input id="onboarding-preparation-start" type="date" required value={profile.preparationStartDate} onChange={setProfileField("preparationStartDate")} style={inputStyle()} />
      </div>
    </div>
  </div>;
}

function PersonalizationFields({ profile, setProfileField, toggleTestSeries }) {
  return <div className="mt-8 rounded-xl border p-4 sm:p-5" style={{ background: COLORS.surface2, borderColor: COLORS.border }}>
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: COLORS.primary, background: COLORS.primary + "18" }}><UserRound size={16} /></div>
      <div>
        <h2 style={TYPE.panelTitle}>About you</h2>
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-age" optional>Age</FieldLabel>
        <input id="onboarding-age" type="number" inputMode="numeric" min="1" max="120" value={profile.age} onChange={setProfileField("age")} placeholder="e.g. 21" style={inputStyle()} />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="onboarding-gender" optional>Gender</FieldLabel>
        <select id="onboarding-gender" value={profile.gender} onChange={setProfileField("gender")} style={selectStyle()}>
          {GENDER_OPTIONS.map((option) => <option key={option.value || "empty"} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FieldLabel htmlFor="onboarding-current-status" optional>Current status</FieldLabel>
        <select id="onboarding-current-status" value={profile.currentStatus} onChange={setProfileField("currentStatus")} style={selectStyle()}>
          <option value="">Select current status</option>
          {CURRENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FieldLabel optional>Test series / coaching</FieldLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TEST_SERIES_OPTIONS.map((series) => {
            const checked = profile.testSeries.includes(series);
            return <label key={series} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ background: checked ? COLORS.primary + "12" : COLORS.surface, borderColor: checked ? COLORS.primary : COLORS.border }}>
              <input type="checkbox" checked={checked} onChange={() => toggleTestSeries(series)} style={{ accentColor: COLORS.primary }} />
              {series}
            </label>;
          })}
        </div>
      </div>
    </div>
  </div>;
}
