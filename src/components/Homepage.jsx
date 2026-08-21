import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  ShieldCheck,
} from "lucide-react";
import { COLORS, SHADOW } from "../constants";
import { LegalLinks } from "./LegalPage";

function Logo() {
  return (
    <a href="#/home" className="flex items-center gap-2.5" aria-label="Odyssey home">
      <img src="/newicon/favicon.svg" className="h-10 w-10" alt="" aria-hidden="true" />
      <span>
        <span className="block text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Odyssey</span>
        <span className="block text-xs" style={{ color: COLORS.inkMuted }}>CAT preparation companion</span>
      </span>
    </a>
  );
}

function Feature({ icon: Icon, title, children }) {
  return (
    <article className="rounded-xl border p-5" style={{ background: COLORS.surface, borderColor: COLORS.border, boxShadow: SHADOW.card }}>
      <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${COLORS.primary}18`, color: COLORS.primary }}>
        <Icon size={20} />
      </span>
      <h3 className="mt-4 text-base font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
      <p className="mt-2 text-sm leading-6" style={{ color: COLORS.inkMuted }}>{children}</p>
    </article>
  );
}

export default function Homepage({ isSignedIn = false }) {
  const accountHref = isSignedIn ? "#/overview" : "#/login";
  const accountLabel = isSignedIn ? "Open dashboard" : "Create an account";

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            {!isSignedIn && (
              <a href="#/login" className="mobile-tap-target hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex" style={{ color: COLORS.ink }}>
                Sign in
              </a>
            )}
            <a href={accountHref} className="mobile-tap-target inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold" style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
              {accountLabel} <ArrowRight size={16} />
            </a>
          </div>
        </header>

        <section className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${COLORS.primary}18`, color: COLORS.primary }}>
              <BookOpenCheck size={14} /> For CAT aspirants
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              A clear record of your CAT preparation.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 sm:text-lg" style={{ color: COLORS.inkMuted }}>
              Odyssey is a personal workspace for CAT preparation. Log mocks, track syllabus coverage, and plan revision work in one place.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: COLORS.inkMuted }}>
              It is not affiliated with the CAT examination, IIMs, or any coaching or test-series provider.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={accountHref} className="mobile-tap-target inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold" style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
                {accountLabel} <ArrowRight size={16} />
              </a>
              {!isSignedIn && (
                <a href="#/login" className="mobile-tap-target inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold" style={{ borderColor: COLORS.border, background: COLORS.surface, color: COLORS.ink }}>
                  Sign in
                </a>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border p-6 sm:p-8" style={{ background: COLORS.surface, borderColor: COLORS.border, boxShadow: "var(--shadow-floating)" }} aria-labelledby="purpose-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: COLORS.primary }}>What Odyssey does</p>
            <h2 id="purpose-title" className="mt-3 text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Turn mock results into useful next steps.
            </h2>
            <p className="mt-4 text-sm leading-6" style={{ color: COLORS.inkMuted }}>
              Review your own mock results, spot patterns worth addressing, and keep your study plan current. Odyssey does not provide official exam results, admissions advice, or guaranteed scores.
            </p>
          </aside>
        </section>

        <section className="border-t py-12 sm:py-16" style={{ borderColor: COLORS.border }} aria-labelledby="features-title">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: COLORS.primary }}>How it works</p>
            <h2 id="features-title" className="mt-3 text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Built around the work that follows each mock.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Feature icon={BarChart3} title="Log mock tests">
              Record scores, attempts, accuracy, and sectional results for VARC, DILR, and Quant. Compare each mock with your recent work.
            </Feature>
            <Feature icon={BookOpenCheck} title="Track syllabus work">
              Mark topics as complete and see which areas still need planned study.
            </Feature>
            <Feature icon={CalendarCheck2} title="Plan revisions">
              Set targets, schedule mocks, and use your results to choose the next revision session.
            </Feature>
          </div>
        </section>

        <section className="grid gap-6 border-t py-12 sm:grid-cols-[1fr_auto] sm:items-center" style={{ borderColor: COLORS.border }} aria-labelledby="account-title">
          <div>
            <h2 id="account-title" className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your preparation data, kept in your account.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: COLORS.inkMuted }}>
              Create an account to save your data and return to it across sessions. You can export a backup or delete your account from the app.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.primary }}><ShieldCheck size={18} /> Account-based access</span>
        </section>

        <footer className="flex flex-col gap-3 border-t py-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <span className="text-xs" style={{ color: COLORS.inkMuted }}>© {new Date().getFullYear()} Odyssey · CAT preparation companion</span>
          <LegalLinks compact />
        </footer>
      </div>
    </main>
  );
}
