export const uid = () => `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const fmtPct = (x) =>
  x === null || x === undefined || isNaN(x) ? "—" : `${(x * 100).toFixed(1)}%`;

export const fmtNum = (x, d = 1) =>
  x === null || x === undefined || isNaN(x) ? "—" : Number(x).toFixed(d);

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
