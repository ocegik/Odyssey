import { useState } from "react";
import { ArrowRight, BarChart3, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { COLORS } from "../constants";
import { LegalLinks } from "./LegalPage";

const inputStyle = {
  width: "100%",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 9,
  background: COLORS.surface2,
  color: COLORS.ink,
  padding: "11px 12px",
  fontSize: 14,
};

export default function AuthLanding({ auth }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const data = await auth.signUp({ email, password });
        setMessage(data.session ? "Your account is ready." : "Check your inbox to confirm your email, then sign in.");
      } else {
        await auth.signIn({ email, password });
      }
    } catch (err) {
      setError(err.message || "Could not complete that request.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await auth.signInWithGoogle();
      // The browser normally leaves for Google immediately. This message is
      // useful if a browser delays that navigation for any reason.
      setMessage("Opening Google sign-in…");
    } catch (err) {
      setError(err.message || "Could not start Google sign-in.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10" style={{ background: COLORS.bg, color: COLORS.ink }}>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.12fr_.88fr]">
        <section className="max-w-xl">
          <a href="#/home" className="mobile-tap-target mb-8 flex w-fit items-center gap-2.5 rounded-lg focus:outline-none">
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Odyssey</p>
              <p className="text-xs" style={{ color: COLORS.inkMuted }}>CAT mock tracker</p>
            </div>
          </a>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: COLORS.primary + "18", color: COLORS.primary }}>
            <BarChart3 size={14} /> CAT preparation companion
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Odyssey is a CAT mock-test tracking app.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed sm:text-lg" style={{ color: COLORS.inkMuted }}>
            It helps CAT aspirants record mock-test results, review performance across VARC, DILR, and Quant, and organise their syllabus and revision work in one place.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed" style={{ color: COLORS.inkMuted }}>
            Odyssey is an independent study-planning tool. It is not affiliated with the CAT examination, IIMs, or any test-series provider.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Feature icon={BarChart3} title="Track and review" text="Log mock scores, accuracy, attempts, and section-level performance over time." />
            <Feature icon={ShieldCheck} title="Plan your preparation" text="Maintain syllabus progress, targets, and revision work in your account." />
          </div>
        </section>

        <section className="w-full rounded-2xl border p-6 shadow-lg sm:p-8" style={{ background: COLORS.surface, borderColor: COLORS.border, boxShadow: "var(--shadow-floating)" }}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
              <p className="mt-1 text-sm" style={{ color: COLORS.inkMuted }}>{mode === "signup" ? "Start tracking your prep in a minute." : "Sign in to continue where you left off."}</p>
            </div>
            <KeyRound size={22} style={{ color: COLORS.primary, flexShrink: 0 }} />
          </div>
          <button type="button" onClick={signInWithGoogle} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: COLORS.border, background: COLORS.surface, color: COLORS.ink }}>
            <GoogleMark /> {busy ? "Opening Google…" : "Continue with Google"}
          </button>
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1" style={{ background: COLORS.border }} />
            <span className="text-xs font-medium" style={{ color: COLORS.inkMuted }}>or continue with email</span>
            <span className="h-px flex-1" style={{ background: COLORS.border }} />
          </div>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: COLORS.ink }}>
              Email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: COLORS.ink }}>
              Password
              <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
              {mode === "signup" && <span className="text-xs font-normal" style={{ color: COLORS.inkMuted }}>Use at least 6 characters.</span>}
            </label>
            {error && <p role="alert" className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
            {message && <p role="status" className="text-sm" style={{ color: COLORS.good }}>{message}</p>}
            <button type="submit" disabled={busy} className="mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
              {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={16} />
            </button>
          </form>
          <p className="mt-5 text-center text-sm" style={{ color: COLORS.inkMuted }}>
            {mode === "signup" ? "Already have an account?" : "New to Odyssey?"}{" "}
            <button type="button" className="font-semibold underline underline-offset-2" style={{ color: COLORS.primary }} onClick={() => { setMode((current) => current === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
          {mode === "signup" && (
            <p className="mt-4 text-center text-xs leading-5" style={{ color: COLORS.inkMuted }}>
              By creating an account, you agree to Odyssey’s <a className="underline underline-offset-2" style={{ color: COLORS.primary }} href="#/terms">Terms of Service</a> and acknowledge the <a className="underline underline-offset-2" style={{ color: COLORS.primary }} href="#/privacy">Privacy Policy</a>.
            </p>
          )}
        </section>

        <div className="lg:col-span-2 flex justify-center pt-1">
          <LegalLinks />
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.8 12.23c0-.71-.06-1.22-.2-1.76H12v3.53h5.64c-.11.88-.71 2.2-2.04 3.09l-.02.12 2.96 2.29.2.02c1.83-1.69 3.06-4.18 3.06-7.29Z" />
    <path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.77-2.48l-3.22-2.5c-.86.6-2.01 1.02-3.55 1.02a6.14 6.14 0 0 1-5.81-4.24l-.11.01-3.08 2.38-.04.1A10.22 10.22 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.19 13.8A6.15 6.15 0 0 1 5.85 12c0-.63.12-1.24.33-1.8v-.12L3.07 7.66l-.1.05A10.27 10.27 0 0 0 1.9 12c0 1.54.37 2.99 1.07 4.29l3.22-2.49Z" />
    <path fill="#EA4335" d="M12 5.96c1.94 0 3.25.84 3.99 1.54l2.91-2.84C17.07 2.97 14.76 2 12 2a10.22 10.22 0 0 0-9.04 5.71l3.22 2.5A6.17 6.17 0 0 1 12 5.96Z" />
  </svg>;
}

function Feature({ icon: Icon, title, text }) {
  return <div className="rounded-xl border p-4" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
    <Icon size={18} style={{ color: COLORS.primary }} />
    <p className="mt-3 text-sm font-semibold">{title}</p>
    <p className="mt-1 text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>{text}</p>
  </div>;
}
