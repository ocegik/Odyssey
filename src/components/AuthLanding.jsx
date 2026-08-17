import { useState } from "react";
import { ArrowRight, BarChart3, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { COLORS } from "../constants";

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

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10" style={{ background: COLORS.bg, color: COLORS.ink }}>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.12fr_.88fr]">
        <section className="max-w-xl">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Odyssey</p>
              <p className="text-xs" style={{ color: COLORS.inkMuted }}>CAT mock tracker</p>
            </div>
          </div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: COLORS.primary + "18", color: COLORS.primary }}>
            <BarChart3 size={14} /> A clearer way to prepare
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Turn every CAT mock into your next smart move.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed sm:text-lg" style={{ color: COLORS.inkMuted }}>
            Track VARC, DILR, and Quant with the context that matters—so your prep improves from mock to mock.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Feature icon={BarChart3} title="Mock trends" text="See your score, accuracy, and attempts evolve over time." />
            <Feature icon={ShieldCheck} title="Private by default" text="Your progress stays tied to your own account." />
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
        </section>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, title, text }) {
  return <div className="rounded-xl border p-4" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
    <Icon size={18} style={{ color: COLORS.primary }} />
    <p className="mt-3 text-sm font-semibold">{title}</p>
    <p className="mt-1 text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>{text}</p>
  </div>;
}
