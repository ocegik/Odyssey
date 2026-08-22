import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X } from "lucide-react";
import { COLORS } from "../../constants";

/** Client-only image preview. The object URL shown here is the same Blob that Download saves. */
export default function ShareImageButton({ createImage, label = "Share" }) {
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const close = () => setPreview(null);
  useEffect(() => {
    if (!preview) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      URL.revokeObjectURL(preview.url);
    };
  }, [preview]);
  const openPreview = async () => { setCreating(true); try { const image = await createImage(); setPreview({ ...image, url: URL.createObjectURL(image.blob) }); } finally { setCreating(false); } };
  const download = () => { const link = document.createElement("a"); link.href = preview.url; link.download = preview.filename; link.click(); };
  return <>
    <button type="button" onClick={openPreview} disabled={creating} className="theme-hover inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs disabled:cursor-wait disabled:opacity-60" style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.inkMuted, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}><Share2 size={13} /> {creating ? "Preparing…" : label}</button>
    {preview && createPortal(
      <div role="dialog" aria-modal="true" aria-label="Share image preview" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: "rgba(0,0,0,0.72)" }}>
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col p-4 sm:max-h-[calc(100dvh-3rem)] sm:p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "var(--shadow-floating)" }}>
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3"><div><h2 style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700 }}>Preview</h2><p className="mt-0.5 text-xs" style={{ color: COLORS.inkMuted }}>This exact image will be downloaded.</p></div><button type="button" aria-label="Close preview" onClick={close} className="theme-hover shrink-0 p-2" style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.inkMuted }}><X size={16} /></button></div>
          <div className="min-h-0 flex-1"><img src={preview.url} alt="Share image preview" className="block h-full w-full object-contain" style={{ borderRadius: 9, border: `1px solid ${COLORS.border}` }} /></div>
          <div className="mt-4 flex shrink-0 justify-end gap-2"><button type="button" onClick={close} className="theme-hover px-3 py-2 text-sm" style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.ink }}>Close</button><button type="button" onClick={download} className="inline-flex items-center gap-2 px-3 py-2 text-sm" style={{ background: COLORS.primary, border: "none", borderRadius: 8, color: COLORS.onPrimary, fontWeight: 650 }}><Download size={15} /> Download PNG</button></div>
        </div>
      </div>,
      document.body,
    )}
  </>;
}
