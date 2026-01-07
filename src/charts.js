function niceNumber(x) {
  if (!Number.isFinite(x)) return 0;
  const abs = Math.abs(x);
  if (abs === 0) return 0;
  const exp = Math.floor(Math.log10(abs));
  const base = abs / 10 ** exp;
  const niceBase = base < 1.5 ? 1 : base < 3 ? 2 : base < 7 ? 5 : 10;
  return Math.sign(x) * niceBase * 10 ** exp;
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function getTheme() {
  return {
    area: cssVar("--chart-area", "#ffffff"),
    border: cssVar("--chart-border", "rgba(15,23,42,0.12)"),
    grid: cssVar("--chart-grid", "rgba(15,23,42,0.08)"),
    text: cssVar("--chart-text", "rgba(15,23,42,0.7)")
  };
}

function drawAxes(ctx, { w, h, pad, xMin, xMax, yMin, yMax, xLabel, yLabel, yTickFormat, theme }) {
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  ctx.fillStyle = theme.area;
  ctx.fillRect(pad.l, pad.t, plotW, plotH);

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.l, pad.t, plotW, plotH);

  const tick = niceNumber((yMax - yMin) / 4);
  ctx.fillStyle = theme.text;
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const formatTick = typeof yTickFormat === "function" ? yTickFormat : (v) => v.toFixed(0);
  for (let y = Math.ceil(yMin / tick) * tick; y <= yMax; y += tick) {
    const py = pad.t + (1 - (y - yMin) / (yMax - yMin || 1)) * plotH;
    ctx.strokeStyle = theme.grid;
    ctx.beginPath();
    ctx.moveTo(pad.l, py);
    ctx.lineTo(pad.l + plotW, py);
    ctx.stroke();
    ctx.fillText(formatTick(y), pad.l - 6, py);
  }

  ctx.fillStyle = theme.text;
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (xLabel) ctx.fillText(xLabel, pad.l, h - 8);
  if (yLabel) ctx.fillText(yLabel, pad.l, Math.max(12, pad.t - 12));
}

export function plotMultiLineChart(
  canvas,
  {
    series,
    xLabel = "",
    yLabel = "",
    markerX = null,
    markerY = null,
    markerColor = "rgba(99,211,166,0.95)",
    yTickFormat = null,
    yDomain = null,
    legend = true
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const theme = getTheme();

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Padding includes a small header area for yLabel + legend above the plot.
  const pad = { l: 54, r: 14, t: 34, b: 34 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const allPoints = series.flatMap((s) => s.points);
  const xs = allPoints.map((p) => p[0]);
  const ys = allPoints.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMinRaw = Math.min(...ys);
  let yMaxRaw = Math.max(...ys);
  if (Array.isArray(yDomain) && yDomain.length === 2) {
    yMinRaw = yDomain[0];
    yMaxRaw = yDomain[1];
  }
  const ySpan = yMaxRaw - yMinRaw || 1;
  const yPad = Array.isArray(yDomain) ? 0 : ySpan * 0.1;
  const yMin = yMinRaw - yPad;
  const yMax = yMaxRaw + yPad;

  const xToPx = (x) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const yToPx = (y) => pad.t + (1 - (y - yMin) / (yMax - yMin || 1)) * plotH;

  drawAxes(ctx, { w, h, pad, xMin, xMax, yMin, yMax, xLabel, yLabel, yTickFormat, theme });

  if (legend) {
    const items = series.filter((s) => s.name);
    if (items.length > 0) {
      ctx.font = "11px ui-sans-serif, system-ui";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const y = Math.max(12, pad.t - 14);

      const blocks = items.map((item) => {
        const label = String(item.name);
        const textW = ctx.measureText(label).width;
        const blockW = textW + 22;
        return { item, label, blockW };
      });
      const totalW = blocks.reduce((acc, b) => acc + b.blockW, 0) + (blocks.length - 1) * 10;

      // Background behind legend so it doesn't visually collide with chart lines.
      const bgPadX = 8;
      const bgPadY = 6;
      const bgW = totalW + bgPadX * 2;
      const bgH = 18 + bgPadY * 2;
      const bgX = Math.max(pad.l, w - pad.r - 8 - bgW);
      const bgY = y - 9 - bgPadY;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(bgX, bgY, bgW, bgH, 10);
      else ctx.rect(bgX, bgY, bgW, bgH);
      ctx.fill();
      ctx.stroke();

      let x = bgX + bgPadX;
      for (const b of blocks) {
        ctx.strokeStyle = b.item.color ?? "#2563eb";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14, y);
        ctx.stroke();
        ctx.fillStyle = theme.text;
        ctx.fillText(b.label, x + 18, y);
        x += b.blockW + 10;
      }
    }
  }

  for (const s of series) {
    ctx.strokeStyle = s.color ?? "rgba(78,160,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.points.forEach(([x, y], idx) => {
      const px = xToPx(x);
      const py = yToPx(y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  if (markerX != null) {
    const mx = xToPx(markerX);
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, pad.t);
    ctx.lineTo(mx, pad.t + plotH);
    ctx.stroke();
  }

  if (markerX != null && markerY != null && Number.isFinite(markerY)) {
    const mx = xToPx(markerX);
    const my = yToPx(markerY);
    ctx.fillStyle = markerColor;
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function plotLineChart(canvas, { points, xLabel = "", yLabel = "", markerX = null, markerY = null }) {
  return plotMultiLineChart(canvas, {
    series: [{ name: "", color: "rgba(78,160,255,0.9)", points }],
    xLabel,
    yLabel,
    markerX,
    markerY
  });
}
