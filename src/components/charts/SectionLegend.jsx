import { SECTIONS, SECTION_META } from "../../constants";

export default function SectionLegend() {
  return (
    <div className="flex gap-4 text-xs mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
      {SECTIONS.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: SECTION_META[s].color, display: "inline-block" }} />
          {s}
        </span>
      ))}
    </div>
  );
}
