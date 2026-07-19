import { LineChart as LineChartIcon } from "lucide-react";
import { COLORS, TYPE, SHADOW } from "../../constants";
import EmptyState from "../ui/EmptyState";

export default function ChartFrame({ title, icon: Icon, note, children, empty }) {
  return (
    <div className="p-5 flex flex-col gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} style={{ color: COLORS.inkMuted }} />}
          <h3 style={TYPE.chartTitle}>{title}</h3>
        </div>
        {note && <span className="text-xs" style={{ color: COLORS.inkMuted }}>{note}</span>}
      </div>
      {empty ? <EmptyState icon={LineChartIcon} title="Not enough data yet" body={empty} /> : children}
    </div>
  );
}
