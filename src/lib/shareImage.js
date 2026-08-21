const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1000;

export const SHARE_COLORS = {
  background: "#121212", surface: "#1E1E1E", surfaceRaised: "#262626",
  border: "#3A3A3A", ink: "#F2F2F2", muted: "#A3A3A3", primary: "#B554AA",
  varc: "#F19A7D", dilr: "#57CF9B", quant: "#94B2E3",
};

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y); context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r); context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r); context.closePath();
}

function text(context, value, x, y, font, color = SHARE_COLORS.ink, align = "left") {
  context.font = font; context.fillStyle = color; context.textAlign = align; context.fillText(String(value), x, y); context.textAlign = "left";
}

function wrappedText(context, value, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(value).split(/\s+/); const lines = []; let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((entry, index) => {
    const finalLine = index === maxLines - 1 && lines.length > maxLines ? `${entry.replace(/\s+$/, "")}…` : entry;
    context.fillText(finalLine, x, y + index * lineHeight);
  });
}

function drawBase(context, { title, studentName, subtitle }) {
  context.fillStyle = SHARE_COLORS.background; context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
  context.fillStyle = SHARE_COLORS.primary; roundedRect(context, 76, 62, 11, 45, 6); context.fill();
  text(context, "Odyssey", 105, 96, "700 27px 'Space Grotesk', sans-serif");
  text(context, studentName?.trim() || "Odyssey learner", 76, 167, "500 20px Inter, sans-serif", SHARE_COLORS.muted);
  text(context, title, 76, 235, "700 54px 'Space Grotesk', sans-serif");
  if (subtitle) text(context, subtitle, 76, 274, "500 20px Inter, sans-serif", SHARE_COLORS.muted);
}

function drawFooter(context, caption) {
  context.strokeStyle = SHARE_COLORS.border; context.lineWidth = 1; context.beginPath(); context.moveTo(76, 890); context.lineTo(1524, 890); context.stroke();
  text(context, "odysseyprep.vercel.app", 76, 938, "500 19px Inter, sans-serif", SHARE_COLORS.muted);
  if (caption) text(context, caption, 1524, 938, "500 19px Inter, sans-serif", SHARE_COLORS.muted, "right");
}

function drawMetric(context, metric, x, y, width = 250) {
  roundedRect(context, x, y, width, 112, 16); context.fillStyle = SHARE_COLORS.surfaceRaised; context.fill(); context.strokeStyle = SHARE_COLORS.border; context.stroke();
  text(context, metric.label.toUpperCase(), x + 23, y + 34, "600 16px Inter, sans-serif", SHARE_COLORS.muted);
  text(context, metric.value, x + 23, y + 80, "700 39px 'Space Grotesk', sans-serif");
}

function drawMetrics(context, metrics = []) {
  const list = metrics.slice(0, 3); const width = 250; const gap = 18; const start = 1524 - list.length * width - Math.max(0, list.length - 1) * gap;
  list.forEach((metric, index) => drawMetric(context, metric, start + index * (width + gap), 140, width));
}

function chartBounds() { return { x: 150, y: 350, width: 1300, height: 390 }; }
function finiteValues(data, series) { return data.flatMap((row) => series.map(({ key }) => row[key]).filter(Number.isFinite)); }
function scales(data, series, domain) {
  const values = finiteValues(data, series); const rawMin = domain?.[0] ?? Math.min(...values); const rawMax = domain?.[1] ?? Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.14, rawMax === rawMin ? Math.max(Math.abs(rawMax) * 0.14, 1) : 1);
  const min = domain?.[0] ?? Math.floor(rawMin - pad); const max = domain?.[1] ?? Math.ceil(rawMax + pad);
  return { min, max: Math.max(max, min + 1) };
}

function drawAxes(context, bounds, scale, suffix = "") {
  const yFor = (value) => bounds.y + bounds.height - ((value - scale.min) / (scale.max - scale.min)) * bounds.height;
  context.setLineDash([5, 7]); context.strokeStyle = SHARE_COLORS.border; context.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const value = scale.min + ((scale.max - scale.min) * index) / 4; const y = yFor(value);
    context.beginPath(); context.moveTo(bounds.x, y); context.lineTo(bounds.x + bounds.width, y); context.stroke();
    text(context, `${Math.round(value)}${suffix}`, 120, y + 7, "500 17px 'JetBrains Mono', monospace", SHARE_COLORS.muted, "right");
  }
  context.setLineDash([]); return yFor;
}

function drawXLabels(context, data, bounds) {
  const indexes = data.length <= 5 ? data.map((_, i) => i) : [0, Math.round((data.length - 1) / 2), data.length - 1];
  const xFor = (i) => bounds.x + (data.length === 1 ? bounds.width / 2 : (i / (data.length - 1)) * bounds.width);
  indexes.forEach((index) => text(context, String(data[index].label || "").split(" - ")[0], xFor(index), bounds.y + bounds.height + 42, "500 17px Inter, sans-serif", SHARE_COLORS.muted, "center"));
  return xFor;
}

function drawLegend(context, series) {
  let x = 150;
  series.forEach((item) => { context.fillStyle = item.color; roundedRect(context, x, 813, 12, 12, 3); context.fill(); text(context, item.label, x + 20, 825, "500 16px Inter, sans-serif", SHARE_COLORS.muted); x += context.measureText(item.label).width + 53; });
}

function drawLineChart(context, { data, series, domain, suffix }) {
  const bounds = chartBounds(); const scale = scales(data, series, domain); const yFor = drawAxes(context, bounds, scale, suffix); const xFor = drawXLabels(context, data, bounds);
  series.forEach((line) => {
    let started = false; context.strokeStyle = line.color; context.lineWidth = line.primary ? 6 : 4; context.lineCap = "round"; context.lineJoin = "round"; context.beginPath();
    data.forEach((row, index) => { const value = row[line.key]; if (!Number.isFinite(value)) return; if (!started) { context.moveTo(xFor(index), yFor(value)); started = true; } else context.lineTo(xFor(index), yFor(value)); });
    context.stroke();
    data.forEach((row, index) => { const value = row[line.key]; if (!Number.isFinite(value)) return; context.beginPath(); context.arc(xFor(index), yFor(value), line.primary ? 7 : 5, 0, Math.PI * 2); context.fillStyle = line.color; context.fill(); context.strokeStyle = SHARE_COLORS.background; context.lineWidth = 3; context.stroke(); });
  });
  drawLegend(context, series);
}

function drawBarChart(context, { data, series, domain, suffix }) {
  const bounds = chartBounds(); const scale = scales(data, series, domain || [0, undefined]); const yFor = drawAxes(context, bounds, scale, suffix); const groups = data.length; const groupWidth = bounds.width / groups; const barWidth = Math.min(70, (groupWidth * 0.72) / series.length);
  data.forEach((row, index) => {
    const center = bounds.x + groupWidth * index + groupWidth / 2;
    series.forEach((entry, seriesIndex) => { const value = row[entry.key]; if (!Number.isFinite(value)) return; const x = center - (series.length * barWidth) / 2 + seriesIndex * barWidth; const y = yFor(value); roundedRect(context, x, y, barWidth - 5, bounds.y + bounds.height - y, 6); context.fillStyle = entry.color; context.fill(); });
    text(context, row.label || row.section || row.source, center, bounds.y + bounds.height + 42, "500 16px Inter, sans-serif", SHARE_COLORS.muted, "center");
  });
  drawLegend(context, series);
}

async function canvasToBlob(canvas) { return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the share image.")), "image/png")); }

/** Produces a standalone chart PNG in memory. It never touches a network or persistent storage. */
export async function createChartShareImage({ title, studentName, subtitle, data, series, metrics, chartType = "line", domain, suffix = "", filename }) {
  if (!Array.isArray(data) || !data.length || !finiteValues(data, series).length) throw new Error("There is not enough data to create this share image.");
  const canvas = document.createElement("canvas"); canvas.width = IMAGE_WIDTH; canvas.height = IMAGE_HEIGHT;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Your browser cannot create the share image.");
  drawBase(context, { title, studentName, subtitle }); drawMetrics(context, metrics);
  if (chartType === "bar") drawBarChart(context, { data, series, domain, suffix }); else drawLineChart(context, { data, series, domain, suffix });
  drawFooter(context, `${data.length} data point${data.length === 1 ? "" : "s"}`);
  return { blob: await canvasToBlob(canvas), filename: filename || "odyssey-share.png" };
}

export async function createListShareImage({ title, studentName, subtitle, items, filename }) {
  const canvas = document.createElement("canvas"); canvas.width = IMAGE_WIDTH; canvas.height = IMAGE_HEIGHT;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Your browser cannot create the share image.");
  drawBase(context, { title, studentName, subtitle });
  const rows = items.slice(0, 5); const rowHeight = Math.min(115, 520 / Math.max(rows.length, 1));
  rows.forEach((item, index) => { const y = 340 + index * (rowHeight + 14); roundedRect(context, 76, y, 1448, rowHeight, 15); context.fillStyle = SHARE_COLORS.surface; context.fill(); context.strokeStyle = SHARE_COLORS.border; context.stroke(); context.fillStyle = item.color || SHARE_COLORS.primary; roundedRect(context, 76, y, 5, rowHeight, 3); context.fill(); text(context, item.label, 108, y + 34, "600 17px Inter, sans-serif", item.color || SHARE_COLORS.primary); context.font = "500 22px Inter, sans-serif"; context.fillStyle = SHARE_COLORS.ink; wrappedText(context, item.text, 108, y + 70, 1360, 28, rowHeight >= 105 ? 2 : 1); });
  drawFooter(context, `${rows.length} highlight${rows.length === 1 ? "" : "s"}`);
  return { blob: await canvasToBlob(canvas), filename: filename || "odyssey-share.png" };
}

export const shareSeries = {
  overall: { key: "marks", label: "Overall marks", color: SHARE_COLORS.primary, primary: true },
  VARC: { key: "VARC", label: "VARC", color: SHARE_COLORS.varc },
  DILR: { key: "DILR", label: "DILR", color: SHARE_COLORS.dilr },
  Quant: { key: "Quant", label: "Quant", color: SHARE_COLORS.quant },
  Overall: { key: "Overall", label: "Overall", color: SHARE_COLORS.ink, primary: true },
};
