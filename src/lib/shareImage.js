const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1000;

const SHARE_COLORS = {
  background: "#121212",
  surface: "#1E1E1E",
  surfaceRaised: "#262626",
  border: "#3A3A3A",
  ink: "#F2F2F2",
  muted: "#A3A3A3",
  primary: "#B554AA",
};

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawMetricCard(context, { x, y, label, value }) {
  roundedRect(context, x, y, 275, 126, 18);
  context.fillStyle = SHARE_COLORS.surfaceRaised;
  context.fill();
  context.strokeStyle = SHARE_COLORS.border;
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = SHARE_COLORS.muted;
  context.font = "600 18px Inter, sans-serif";
  context.fillText(label.toUpperCase(), x + 26, y + 37);
  context.fillStyle = SHARE_COLORS.ink;
  context.font = "700 45px 'Space Grotesk', sans-serif";
  context.fillText(value, x + 26, y + 91);
}

function drawLineChart(context, data) {
  const area = { x: 145, y: 328, width: 1310, height: 415 };
  const marks = data.map((row) => row.marks);
  const minMark = Math.min(...marks);
  const maxMark = Math.max(...marks);
  const padding = Math.max((maxMark - minMark) * 0.16, 3);
  const lower = Math.floor((minMark - padding) / 5) * 5;
  const upper = Math.ceil((maxMark + padding) / 5) * 5;
  const range = Math.max(upper - lower, 1);
  const xFor = (index) => area.x + (data.length === 1 ? area.width / 2 : (index / (data.length - 1)) * area.width);
  const yFor = (value) => area.y + area.height - ((value - lower) / range) * area.height;

  context.strokeStyle = SHARE_COLORS.border;
  context.lineWidth = 1;
  context.setLineDash([5, 7]);
  context.font = "500 18px 'JetBrains Mono', monospace";
  context.fillStyle = SHARE_COLORS.muted;
  for (let index = 0; index <= 4; index += 1) {
    const value = lower + (range / 4) * index;
    const y = yFor(value);
    context.beginPath();
    context.moveTo(area.x, y);
    context.lineTo(area.x + area.width, y);
    context.stroke();
    context.fillText(String(Math.round(value)), 78, y + 7);
  }
  context.setLineDash([]);

  context.strokeStyle = SHARE_COLORS.primary;
  context.lineWidth = 6;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  data.forEach((row, index) => {
    const x = xFor(index);
    const y = yFor(row.marks);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  data.forEach((row, index) => {
    const x = xFor(index);
    const y = yFor(row.marks);
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fillStyle = SHARE_COLORS.primary;
    context.fill();
    context.strokeStyle = SHARE_COLORS.background;
    context.lineWidth = 4;
    context.stroke();
  });

  const labelIndexes = data.length <= 5
    ? data.map((_, index) => index)
    : [0, Math.round((data.length - 1) / 2), data.length - 1];
  context.fillStyle = SHARE_COLORS.muted;
  context.font = "500 17px Inter, sans-serif";
  context.textAlign = "center";
  labelIndexes.forEach((index) => {
    const dateLabel = data[index].label.split(" - ")[0];
    context.fillText(dateLabel, xFor(index), area.y + area.height + 42);
  });
  context.textAlign = "left";
}

function toPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the share image."));
    }, "image/png");
  });
}

/**
 * Renders a standalone image from supplied view data. It deliberately uses a
 * canvas rather than the on-screen chart, so future shares can reuse this
 * local-only download path without capturing UI or uploading any data.
 */
export async function downloadMockMarksTrendImage({ data, studentName, latestMarks, bestMarks }) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("At least one scored mock is required to create a share image.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser cannot create the share image.");

  context.fillStyle = SHARE_COLORS.background;
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  context.fillStyle = SHARE_COLORS.primary;
  roundedRect(context, 76, 66, 12, 50, 6);
  context.fill();
  context.fillStyle = SHARE_COLORS.ink;
  context.font = "700 28px 'Space Grotesk', sans-serif";
  context.fillText("Odyssey", 108, 103);

  context.fillStyle = SHARE_COLORS.muted;
  context.font = "500 21px Inter, sans-serif";
  context.fillText(studentName?.trim() || "Odyssey learner", 76, 178);
  context.fillStyle = SHARE_COLORS.ink;
  context.font = "700 58px 'Space Grotesk', sans-serif";
  context.fillText("Mock Marks Trend", 76, 247);

  drawMetricCard(context, { x: 982, y: 150, label: "Latest marks", value: formatMarks(latestMarks) });
  drawMetricCard(context, { x: 1180, y: 150, label: "Best marks", value: formatMarks(bestMarks) });
  drawLineChart(context, data);

  context.strokeStyle = SHARE_COLORS.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(76, 890);
  context.lineTo(1524, 890);
  context.stroke();
  context.fillStyle = SHARE_COLORS.muted;
  context.font = "500 19px Inter, sans-serif";
  context.fillText("odysseyprep.vercel.app", 76, 938);
  context.textAlign = "right";
  context.fillText(`${data.length} scored mock${data.length === 1 ? "" : "s"}`, 1524, 938);
  context.textAlign = "left";

  const blob = await toPngBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "odyssey-mock-marks-trend.png";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatMarks(value) {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : Number(value).toFixed(1);
}
