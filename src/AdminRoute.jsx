import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useAdminRole } from "./hooks/useAdminRole";
import AdminDashboard from "./components/AdminDashboard";
import AuthControl from "./components/layout/AuthControl";
import { COLORS, FONT_IMPORT, THEME_COLORS, TYPE } from "./constants";

function redirectHome() {
  window.location.replace("/");
}

export default function AdminRoute() {
  const auth = useAuth();
  const admin = useAdminRole(auth.user?.id);
  // A restored session and its profile query settle independently. Do not
  // evaluate a stale result from the previous (or anonymous) user in between.
  const roleResolvedForCurrentUser = admin.userId === (auth.user?.id ?? null);
  const canEvaluate = auth.status !== "loading"
    && roleResolvedForCurrentUser
    && admin.status !== "loading"
    && admin.status !== "idle";

  useEffect(() => {
    if (canEvaluate && !admin.isAdmin) redirectHome();
  }, [admin.isAdmin, canEvaluate]);

  return (
    <div
      className="min-h-screen"
      style={{
        "--color-bg": THEME_COLORS.light.bg,
        "--color-surface": THEME_COLORS.light.surface,
        "--color-surface-2": THEME_COLORS.light.surface2,
        "--color-border": THEME_COLORS.light.border,
        "--color-ink": THEME_COLORS.light.ink,
        "--color-ink-muted": THEME_COLORS.light.inkMuted,
        "--color-primary": THEME_COLORS.light.primary,
        "--color-info": THEME_COLORS.light.info,
        "--color-good": THEME_COLORS.light.good,
        "--color-warn": THEME_COLORS.light.warn,
        "--color-danger": THEME_COLORS.light.danger,
        "--shadow-card": THEME_COLORS.light.shadowCard,
        background: COLORS.bg,
        color: COLORS.ink,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; } button { cursor: pointer; }`}</style>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="inline-flex items-center gap-2 text-sm" style={{ color: COLORS.inkMuted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            <ArrowLeft size={15} aria-hidden="true" /> Odyssey
          </a>
          <AuthControl auth={auth} onSignedOut={redirectHome} />
        </header>
        {auth.status === "loading" || admin.status === "loading" ? <p className="text-sm" style={{ color: COLORS.inkMuted }}>Checking access…</p> : null}
        {canEvaluate && admin.isAdmin ? <AdminDashboard /> : null}
      </div>
    </div>
  );
}
