import { useState } from "react";
import { KeyRound, LogIn, LogOut, UserRound } from "lucide-react";
import { COLORS } from "../../constants";

const panelStyle = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  boxShadow: "var(--shadow-floating)",
};

const inputStyle = {
  width: "100%",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 7,
  background: COLORS.surface2,
  color: COLORS.ink,
  padding: "8px 10px",
  fontSize: 13,
};

export default function AuthControl({ auth, onSignedOut }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (auth.status === "unavailable") return null;

  const close = () => {
    setOpen(false);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const data = await auth.signUp({ email, password });
        setMessage(
          data.session
            ? "Your account is ready."
            : "Check your inbox to confirm your email, then sign in.",
        );
      } else {
        await auth.signIn({ email, password });
        close();
      }
    } catch (err) {
      setError(err.message || "Could not complete that request.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError("");
    try {
      await auth.signOut();
      onSignedOut?.();
      close();
    } catch (err) {
      setError(err.message || "Could not sign out.");
    } finally {
      setBusy(false);
    }
  };

  const buttonStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    background: COLORS.surface,
    color: COLORS.ink,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
  };

  if (auth.status === "loading") {
    return <span className="px-3 py-2 text-sm" style={{ color: COLORS.inkMuted }}>Checking account…</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="theme-hover flex items-center gap-1.5 px-3 py-2 text-sm"
        style={buttonStyle}
      >
        {auth.user ? <UserRound size={14} /> : <LogIn size={14} />}
        {auth.user ? "Account" : "Sign in"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Account"
          className="absolute right-0 top-full z-30 mt-2 w-72 p-4"
          style={panelStyle}
        >
          {auth.user ? (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm" style={{ color: COLORS.ink, fontWeight: 600 }}>Signed in</p>
                <p className="mt-0.5 break-all text-xs" style={{ color: COLORS.inkMuted }}>{auth.user.email}</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.inkMuted }}>
                Your mocks, detailed analysis, settings, and syllabus progress are stored privately for this account. Signing out clears this browser's account data immediately.
              </p>
              {error && <p className="text-xs" role="alert" style={{ color: COLORS.danger }}>{error}</p>}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                style={{ ...buttonStyle, color: COLORS.danger }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm" style={{ color: COLORS.ink, fontWeight: 650 }}>
                    {mode === "signin" ? "Welcome back" : "Create an account"}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: COLORS.inkMuted }}>
                    {mode === "signin" ? "Sign in with your email and password." : "Accounts are ready for private storage in a later phase."}
                  </p>
                </div>
                <KeyRound size={17} style={{ color: COLORS.primary, flexShrink: 0 }} aria-hidden="true" />
              </div>
              <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.inkMuted }}>
                Email
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1 text-xs" style={{ color: COLORS.inkMuted }}>
                Password
                <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
              </label>
              {error && <p className="text-xs" role="alert" style={{ color: COLORS.danger }}>{error}</p>}
              {message && <p className="text-xs" role="status" style={{ color: COLORS.good }}>{message}</p>}
              <button type="submit" disabled={busy} className="px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" style={{ ...buttonStyle, background: COLORS.primary, borderColor: COLORS.primary, color: COLORS.onPrimary }}>
                {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
              <button
                type="button"
                className="text-xs underline underline-offset-2"
                style={{ color: COLORS.inkMuted }}
                onClick={() => {
                  setMode((current) => (current === "signin" ? "signup" : "signin"));
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
