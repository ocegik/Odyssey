import { useState } from "react";
import { Check, MessageSquare, Send, TriangleAlert, X } from "lucide-react";
import { COLORS, SHADOW, TYPE } from "../constants";
import { useHashTab } from "../hooks/useHashTab";
import { supabase } from "../lib/supabaseClient";
import { inputStyle, selectStyle } from "./ui/FieldLabel";

const SUPPORT_EMAIL = "ocegik@gmail.com";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "confusing", label: "Clarity issue" },
  { value: "other", label: "Other" },
];

function emailLink({ category, message, pageContext }) {
  const categoryLabel = CATEGORIES.find((item) => item.value === category)?.label || category;
  const subject = `Odyssey feedback: ${categoryLabel}`;
  const body = [
    `Category: ${categoryLabel}`,
    `Page: ${pageContext}`,
    `App version: ${APP_VERSION}`,
    "",
    message,
  ].join("\n");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Status({ status, fallbackHref }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs" role="status" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.good, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
        <Check size={13} /> Feedback sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs leading-5" role="status" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.surface, color: COLORS.danger, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
        <TriangleAlert size={13} className="shrink-0" /> Feedback could not be sent. <a href={fallbackHref} className="underline">Send it by email instead</a>.
      </span>
    );
  }
  return null;
}

export default function FeedbackBox({ variant = "compact" }) {
  const [pageContext] = useHashTab("overview");
  const [expanded, setExpanded] = useState(variant === "full");
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const fallbackHref = emailLink({ category, message, pageContext });

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setSending(true);
    setStatus(null);
    try {
      if (!supabase) throw new Error("Supabase is unavailable");
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.user) throw sessionError || new Error("No active session");
      const { error } = await supabase.from("feedback").insert({
        user_id: data.session.user.id,
        category,
        message: trimmedMessage,
        page_context: pageContext,
        app_version: APP_VERSION,
      });
      if (error) throw error;
      setMessage("");
      setStatus("sent");
    } catch {
      // Keep the typed text intact so the email fallback never loses feedback.
      setStatus("failed");
    } finally {
      setSending(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 style={TYPE.panelTitle}>Share feedback</h2>
          <p className="mt-1 text-xs" style={{ color: COLORS.inkMuted }}>Report an issue or suggest an improvement.</p>
        </div>
        {variant === "compact" && <button type="button" aria-label="Close feedback form" onClick={() => setExpanded(false)} className="grid place-items-center" style={{ color: COLORS.inkMuted, width: 28, height: 28, borderRadius: 7 }}><X size={16} /></button>}
      </div>
      <label className="flex flex-col gap-1.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
        Category
        <select value={category} onChange={(event) => setCategory(event.target.value)} style={selectStyle()}>
          {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5" style={{ ...TYPE.label, color: COLORS.inkMuted }}>
        Feedback
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={variant === "full" ? 4 : 3} placeholder="Describe what happened or what you would change…" style={{ ...inputStyle(), resize: "vertical", minHeight: 88 }} />
      </label>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Status status={status} fallbackHref={fallbackHref} />
        <button type="submit" disabled={sending || !message.trim()} className="inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50" style={{ marginLeft: "auto", borderRadius: 8, background: COLORS.primary, color: COLORS.onPrimary, fontWeight: 700 }}>
          <Send size={14} /> {sending ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );

  if (variant === "full") {
    return <section className="p-5 sm:p-6" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>{form}</section>;
  }

  return (
    <div className="fixed bottom-5 right-5 z-30" style={{ width: expanded ? "min(360px, calc(100vw - 40px))" : "auto" }}>
      {expanded ? (
        <section className="p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "var(--shadow-floating)" }}>{form}</section>
      ) : (
        <button type="button" onClick={() => setExpanded(true)} className="inline-flex items-center gap-2 px-3 py-2.5 text-sm" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 9, background: COLORS.surface, boxShadow: "var(--shadow-floating)", color: COLORS.ink, fontWeight: 700 }}>
          <MessageSquare size={16} style={{ color: COLORS.primary }} /> Feedback
        </button>
      )}
    </div>
  );
}
