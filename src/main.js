import { expectedProfit, expectedShares, marginPerBox, percentError, unitPrice } from "./model.js";
import { plotMultiLineChart } from "./charts.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

const moneyFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyFmt2 = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function formatMoney(x) {
  if (!Number.isFinite(x)) return "-";
  const abs = Math.abs(x);
  return abs < 10 ? moneyFmt2.format(x) : moneyFmt.format(x);
}

function formatPct(x) {
  if (!Number.isFinite(x)) return "-";
  return `${x.toFixed(2)}%`;
}

function formatNum(x, digits = 3) {
  if (!Number.isFinite(x)) return "-";
  return x.toFixed(digits);
}

function setTab(tabName) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tabName));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${tabName}`));
}

function bindSlider(id, outId, format) {
  const input = $(id);
  const out = $(outId);
  const sync = () => {
    out.textContent = format(Number(input.value));
  };
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  sync();
  return { input, sync };
}

function initTooltipPortal() {
  const tip = document.createElement("div");
  tip.className = "tooltipPortal";
  tip.setAttribute("role", "tooltip");
  tip.setAttribute("aria-hidden", "true");
  document.body.appendChild(tip);

  let activeEl = null;
  let raf = 0;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function place() {
    raf = 0;
    if (!activeEl) return;
    const text = activeEl.getAttribute("data-tooltip");
    if (!text) return;

    tip.textContent = text;
    tip.style.left = "0px";
    tip.style.top = "0px";
    tip.classList.add("is-visible");
    tip.setAttribute("aria-hidden", "false");

    const r = activeEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 10;
    const gap = 10;

    // Measure after content set.
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;

    // Prefer below; if it doesn't fit, place above.
    const belowTop = r.bottom + gap;
    const aboveTop = r.top - gap - th;
    const top = belowTop + th + pad <= vh ? belowTop : aboveTop >= pad ? aboveTop : clamp(belowTop, pad, vh - th - pad);

    // Prefer left-aligned with element; clamp to viewport.
    const leftPreferred = r.left;
    const left = clamp(leftPreferred, pad, vw - tw - pad);

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function schedulePlace() {
    if (raf) return;
    raf = window.requestAnimationFrame(place);
  }

  function showFor(el) {
    if (!el) return;
    const text = el.getAttribute("data-tooltip");
    if (!text) return;
    activeEl = el;
    schedulePlace();
  }

  function hide() {
    activeEl = null;
    tip.classList.remove("is-visible");
    tip.setAttribute("aria-hidden", "true");
  }

  function closestTooltipTarget(node) {
    if (!(node instanceof Element)) return null;
    return node.closest("[data-tooltip]");
  }

  // Hover
  document.addEventListener("pointerover", (e) => {
    const el = closestTooltipTarget(e.target);
    if (!el) return;
    showFor(el);
  });
  document.addEventListener("pointerout", (e) => {
    const from = closestTooltipTarget(e.target);
    const to = closestTooltipTarget(e.relatedTarget);
    if (from && from === activeEl && from !== to) hide();
  });

  // Focus
  document.addEventListener("focusin", (e) => {
    const el = closestTooltipTarget(e.target);
    if (!el) return;
    showFor(el);
  });
  document.addEventListener("focusout", (e) => {
    const from = closestTooltipTarget(e.target);
    const to = closestTooltipTarget(e.relatedTarget);
    if (from && from === activeEl && from !== to) hide();
  });

  // Keep tooltip positioned on scroll/resize.
  window.addEventListener("scroll", schedulePlace, true);
  window.addEventListener("resize", schedulePlace);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });
}

function setChartView(view) {
  const setActive = (el, active) => el.classList.toggle("is-active", active);
  const profitBtn = document.querySelector('.segBtn[data-chart="profit"]');
  const demandBtn = document.querySelector('.segBtn[data-chart="demand"]');
  const profitView = $("chartview-profit");
  const demandView = $("chartview-demand");

  setActive(profitBtn, view === "profit");
  setActive(demandBtn, view === "demand");
  profitBtn.setAttribute("aria-selected", view === "profit" ? "true" : "false");
  demandBtn.setAttribute("aria-selected", view === "demand" ? "true" : "false");
  setActive(profitView, view === "profit");
  setActive(demandView, view === "demand");
}

function initTutorial({ getSimulationParams, applyToSimulation, openSimulationTab }) {
  const stageEls = Array.from(document.querySelectorAll(".tutorialStage"));
  const linkEls = Array.from(document.querySelectorAll(".stepLink"));
  const dots = $("tut-dots");

  const tut = {
    step: 0,
    P: 4.0,
    Q: 100,
    C: 0.02,
    alpha: 0.3,
    V_I: 0.08,
    V_U: 8.0,
    Q_star: 60,
    strictQStar: false,
    sampleVi: 0.06,
    sampleVu: 6.0
  };

  // Dots
  dots.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";
    dots.appendChild(dot);
  }
  const dotEls = Array.from(dots.querySelectorAll(".dot"));

  const tutP = bindSlider("tut-p", "tut-out-p", (v) => `$${v.toFixed(2)}`);
  const tutQ = bindSlider("tut-q", "tut-out-q", (v) => `${v.toFixed(0)} g`);
  const tutVi = bindSlider("tut-vi", "tut-out-vi", (v) => `$${v.toFixed(4)}/g`);
  const tutVu = bindSlider("tut-vu", "tut-out-vu", (v) => `$${v.toFixed(2)}`);
  const tutQStar = bindSlider("tut-qstar", "tut-out-qstar", (v) => `${v.toFixed(0)} g`);
  const tutStrict = $("tut-strict");
  const tutAlpha = bindSlider("tut-alpha", "tut-out-alpha", (v) => v.toFixed(3));
  const tutVIMax = bindSlider("tut-vi-max", "tut-out-vi-max", (v) => `$${v.toFixed(4)}/g`);
  const tutVUMax = bindSlider("tut-vu-max", "tut-out-vu-max", (v) => `$${v.toFixed(2)}`);
  const tutC = bindSlider("tut-c", "tut-out-c", (v) => `$${v.toFixed(4)}/g`);

  function syncInputsFromTut() {
    tutP.input.value = String(tut.P);
    tutQ.input.value = String(tut.Q);
    tutVi.input.value = String(tut.sampleVi);
    tutVu.input.value = String(tut.sampleVu);
    tutQStar.input.value = String(tut.Q_star);
    tutStrict.checked = tut.strictQStar;
    tutAlpha.input.value = String(tut.alpha);
    tutVIMax.input.value = String(tut.V_I);
    tutVUMax.input.value = String(tut.V_U);
    tutC.input.value = String(tut.C);

    tutP.sync();
    tutQ.sync();
    tutVi.sync();
    tutVu.sync();
    tutQStar.sync();
    tutAlpha.sync();
    tutVIMax.sync();
    tutVUMax.sync();
    tutC.sync();
  }

  function recompute() {
    tut.P = Number(tutP.input.value);
    tut.Q = Number(tutQ.input.value);
    tut.sampleVi = Number(tutVi.input.value);
    tut.sampleVu = Number(tutVu.input.value);
    tut.Q_star = Number(tutQStar.input.value);
    tut.strictQStar = Boolean(tutStrict.checked);
    tut.alpha = Number(tutAlpha.input.value);
    tut.V_I = Number(tutVIMax.input.value);
    tut.V_U = Number(tutVUMax.input.value);
    tut.C = Number(tutC.input.value);

    const u = unitPrice({ P: tut.P, Q: tut.Q });
    $("tut-unit").textContent = `$${formatNum(u, 4)}/g`;

    const informedBuys = tut.sampleVi >= u;
    const strictOk = !tut.strictQStar || tut.Q > tut.Q_star;
    const uninformedBuys = tut.sampleVu >= tut.P && strictOk;
    const bi = $("tut-buy-i");
    const bu = $("tut-buy-u");
    bi.textContent = informedBuys ? "Buys" : "Does not buy";
    bu.textContent = uninformedBuys ? "Buys" : "Does not buy";
    bi.className = `badge ${informedBuys ? "good" : "bad"}`;
    bu.className = `badge ${uninformedBuys ? "good" : "bad"}`;

    const shares = expectedShares({
      P: tut.P,
      Q: tut.Q,
      alpha: tut.alpha,
      V_I: tut.V_I,
      V_U: tut.V_U,
      strictQStar: tut.strictQStar,
      Q_star: tut.Q_star
    });
    $("tut-di").textContent = formatNum(shares.dI, 3);
    $("tut-du").textContent = formatNum(shares.dU, 3);
    $("tut-dtot").textContent = formatNum(shares.total, 3);

    const margin = marginPerBox({ P: tut.P, Q: tut.Q, C: tut.C });
    $("tut-margin").textContent = formatMoney(margin);

    const profitPerCustomer = margin * shares.total;
    $("tut-profit").textContent = formatMoney(profitPerCustomer);

    const boundary = tut.V_I > 0 ? tut.P / tut.V_I : Infinity;
    $("tut-boundary").textContent = Number.isFinite(boundary) ? `Q = P/V_I = ${boundary.toFixed(2)} g` : "-";
  }

  function setStep(step) {
    tut.step = Math.max(0, Math.min(4, step));
    $("tut-step-num").textContent = String(tut.step + 1);
    stageEls.forEach((el) => el.classList.toggle("is-active", Number(el.dataset.step) === tut.step));
    linkEls.forEach((el) => el.classList.toggle("is-active", Number(el.dataset.step) === tut.step));
    dotEls.forEach((d, i) => d.classList.toggle("is-active", i === tut.step));
    $("tut-prev").disabled = tut.step === 0;
    $("tut-next").textContent = tut.step === 4 ? "Open simulation" : "Next";
  }

  linkEls.forEach((btn) => btn.addEventListener("click", () => setStep(Number(btn.dataset.step))));
  $("tut-prev").addEventListener("click", () => setStep(tut.step - 1));
  $("tut-next").addEventListener("click", () => {
    if (tut.step >= 4) {
      openSimulationTab();
      return;
    }
    setStep(tut.step + 1);
  });

  $("tut-apply-to-sim").addEventListener("click", () => {
    applyToSimulation({
      P: tut.P,
      Q: tut.Q,
      C: tut.C,
      alpha: tut.alpha,
      V_I: tut.V_I,
      V_U: tut.V_U,
      Q_star: tut.Q_star,
      strictQStar: tut.strictQStar
    });
  });
  $("jump-to-sim").addEventListener("click", openSimulationTab);

  // Make tutorial start from current simulation values if user has already changed them.
  const simParams = getSimulationParams();
  Object.assign(tut, simParams);
  syncInputsFromTut();
  recompute();

  [
    tutP.input,
    tutQ.input,
    tutVi.input,
    tutVu.input,
    tutQStar.input,
    tutAlpha.input,
    tutVIMax.input,
    tutVUMax.input,
    tutC.input
  ].forEach((el) => el.addEventListener("input", recompute));
  tutStrict.addEventListener("change", recompute);

  setStep(0);
}

async function main() {
  initTooltipPortal();
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

  document.querySelectorAll(".segBtn").forEach((b) =>
    b.addEventListener("click", () => setChartView(b.dataset.chart))
  );
  setChartView("profit");

  const state = {
    Q: 100,
    P: 4.0,
    C: 0.02,
    alpha: 0.3,
    V_I: 0.08,
    V_U: 8.0,
    strictQStar: false,
    Q_star: 60,
    N: 100000,
    seed: 12345
  };

  // Simulation controls
  const inpQ = bindSlider("inp-q", "out-q", (v) => `${v.toFixed(0)} g`);
  const inpP = bindSlider("inp-p", "out-p", (v) => `$${v.toFixed(2)}`);
  const inpC = bindSlider("inp-c", "out-c", (v) => `$${v.toFixed(4)}/g`);
  const inpAlpha = bindSlider("inp-alpha", "out-alpha", (v) => v.toFixed(3));
  const inpVI = bindSlider("inp-vi", "out-vi", (v) => `$${v.toFixed(4)}/g`);
  const inpVU = bindSlider("inp-vu", "out-vu", (v) => `$${v.toFixed(2)}`);
  const inpQStar = bindSlider("inp-qstar", "out-qstar", (v) => `${v.toFixed(0)} g`);
  const inpStrict = $("inp-strict");
  const inpN = bindSlider("inp-n", "out-n", (v) => v.toFixed(0));
  const inpSeed = $("inp-seed");
  const selPreset = $("sel-preset");

  function syncControlsFromState() {
    inpQ.input.value = String(state.Q);
    inpP.input.value = String(state.P);
    inpC.input.value = String(state.C);
    inpAlpha.input.value = String(state.alpha);
    inpVI.input.value = String(state.V_I);
    inpVU.input.value = String(state.V_U);
    inpQStar.input.value = String(state.Q_star);
    inpStrict.checked = state.strictQStar;
    inpN.input.value = String(state.N);
    inpSeed.value = String(state.seed);

    inpQ.sync();
    inpP.sync();
    inpC.sync();
    inpAlpha.sync();
    inpVI.sync();
    inpVU.sync();
    inpQStar.sync();
    inpN.sync();
  }

  // Worker + sim state
  const worker = new Worker(new URL("./simWorker.js", import.meta.url), { type: "module" });
  let simPhase = "ready"; // ready | running | paused | done
  let hasRun = false;

  let lastSim = {
    processed: 0,
    sold: 0,
    soldI: 0,
    soldU: 0,
    profit: 0,
    analyticSold: 0,
    analyticProfit: 0
  };

  function setSimStatus() {
    const status = $("sim-status");
    if (simPhase === "running") status.textContent = "Running...";
    else if (simPhase === "paused") status.textContent = "Paused";
    else if (simPhase === "done") status.textContent = "Done";
    else status.textContent = "Ready";
  }

  let configureTimer = null;
  function configureWorkerDebounced() {
    if (configureTimer) clearTimeout(configureTimer);
    configureTimer = setTimeout(() => {
      configureTimer = null;
      configureWorkerImmediate();
    }, 100);
  }

  function configureWorkerImmediate() {
    simPhase = "ready";
    hasRun = false;
    setSimStatus();
    worker.postMessage({
      type: "configure",
      config: {
        ...state,
        batchSize: 2500,
        emitEveryMs: 80,
        yieldEveryMs: 12
      }
    });
  }

  // Analytic sweep cache
  let cachedSweep = null;

  function computeSweep() {
    const qMin = 1;
    const qMax = 160;
    const profitPoints = [];
    const dIPoints = [];
    const dUPoints = [];
    const totalPoints = [];
    let best = { Q: qMin, profit: -Infinity };

    for (let q = qMin; q <= qMax; q += 1) {
      const a = expectedProfit({
        P: state.P,
        Q: q,
        C: state.C,
        N: state.N,
        alpha: state.alpha,
        V_I: state.V_I,
        V_U: state.V_U,
        strictQStar: state.strictQStar,
        Q_star: state.Q_star
      });
      profitPoints.push([q, a.expectedProfitTotal]);
      if (a.expectedProfitTotal > best.profit) best = { Q: q, profit: a.expectedProfitTotal };

      const s = expectedShares({
        P: state.P,
        Q: q,
        alpha: state.alpha,
        V_I: state.V_I,
        V_U: state.V_U,
        strictQStar: state.strictQStar,
        Q_star: state.Q_star
      });
      dIPoints.push([q, s.dI]);
      dUPoints.push([q, s.dU]);
      totalPoints.push([q, s.total]);
    }

    return { profitPoints, dIPoints, dUPoints, totalPoints, best };
  }

  function refreshAnalytic() {
    const u = unitPrice({ P: state.P, Q: state.Q });
    const margin = marginPerBox({ P: state.P, Q: state.Q, C: state.C });
    $("stat-unit-price").textContent = `$${formatNum(u, 4)}/g`;
    $("stat-margin").textContent = formatMoney(margin);

    const shrinkRay = state.Q <= 0 || state.V_I <= 0 || state.Q <= state.P / state.V_I;
    const regimeEl = $("pill-regime");
    regimeEl.textContent = shrinkRay ? "Shrink-ray (informed approx 0)" : "Normal";
    regimeEl.classList.toggle("good", !shrinkRay);
    regimeEl.classList.toggle("bad", shrinkRay);

    const analytic = expectedProfit({
      P: state.P,
      Q: state.Q,
      C: state.C,
      N: state.N,
      alpha: state.alpha,
      V_I: state.V_I,
      V_U: state.V_U,
      strictQStar: state.strictQStar,
      Q_star: state.Q_star
    });
    $("stat-analytic-sold").textContent = analytic.expectedSold.toFixed(0);
    $("stat-analytic-profit").textContent = formatMoney(analytic.expectedProfitTotal);

    cachedSweep = computeSweep();
  }

  function refreshHud() {
    const processed = Number(lastSim.processed ?? 0);
    $("stat-processed").textContent = `${processed.toFixed(0)} / ${state.N}`;
    $("stat-sold").textContent = `${Number(lastSim.sold ?? 0).toFixed(0)}`;
    const soldI = Number(lastSim.soldI ?? 0);
    const soldU = Number(lastSim.soldU ?? 0);
    $("stat-sold-breakdown").textContent = `${soldI.toFixed(0)} / ${soldU.toFixed(0)}`;
    const prog = $("sim-progress");
    prog.max = state.N;
    prog.value = processed;

    if (!hasRun) {
      $("stat-profit").textContent = "-";
      $("stat-error").textContent = "-";
      return;
    }

    $("stat-profit").textContent = formatMoney(lastSim.profit ?? 0);
    const err = percentError(lastSim.profit ?? 0, lastSim.analyticProfit ?? 0);
    $("stat-error").textContent = Number.isFinite(err) ? formatPct(err) : "-";
  }

  function refreshCharts() {
    if (!cachedSweep) cachedSweep = computeSweep();

    plotMultiLineChart($("chart-profit"), {
      series: [{ name: "Expected profit", color: "#2563eb", points: cachedSweep.profitPoints }],
      xLabel: "Q (grams)",
      yLabel: "Profit ($)",
      markerX: state.Q,
      markerY: hasRun ? lastSim.profit : null,
      legend: true
    });

    plotMultiLineChart($("chart-demand"), {
      series: [
        { name: "D_i(Q)", color: "#16a34a", points: cachedSweep.dIPoints },
        { name: "D_u(P)", color: "#f59e0b", points: cachedSweep.dUPoints },
        { name: "Total", color: "#2563eb", points: cachedSweep.totalPoints }
      ],
      xLabel: "Q (grams)",
      yLabel: "Share",
      markerX: state.Q,
      markerY: expectedShares({
        P: state.P,
        Q: state.Q,
        alpha: state.alpha,
        V_I: state.V_I,
        V_U: state.V_U,
        strictQStar: state.strictQStar,
        Q_star: state.Q_star
      }).total,
      markerColor: "rgba(15, 23, 42, 0.9)",
      yDomain: [0, 1],
      yTickFormat: (v) => v.toFixed(2),
      legend: true
    });

    const caption = $("profit-caption");
    const analytic = expectedProfit({
      P: state.P,
      Q: state.Q,
      C: state.C,
      N: state.N,
      alpha: state.alpha,
      V_I: state.V_I,
      V_U: state.V_U,
      strictQStar: state.strictQStar,
      Q_star: state.Q_star
    });
    caption.textContent = hasRun
      ? `Q=${state.Q} - analytic=${formatMoney(analytic.expectedProfitTotal)} - sim=${formatMoney(lastSim.profit ?? 0)}`
      : `Q=${state.Q} - analytic=${formatMoney(analytic.expectedProfitTotal)} - run simulation to compare`;
  }

  function onAnyChange() {
    state.Q = Number(inpQ.input.value);
    state.P = Number(inpP.input.value);
    state.C = Number(inpC.input.value);
    state.alpha = Number(inpAlpha.input.value);
    state.V_I = Number(inpVI.input.value);
    state.V_U = Number(inpVU.input.value);
    state.Q_star = Number(inpQStar.input.value);
    state.strictQStar = Boolean(inpStrict.checked);
    state.N = Number(inpN.input.value);
    state.seed = Number(inpSeed.value || "1");

    selPreset.value = "custom";
    refreshAnalytic();
    refreshHud();
    refreshCharts();
    configureWorkerDebounced();
  }

  function applyParamsToSimulation(params) {
    if (typeof params.P === "number") state.P = params.P;
    if (typeof params.Q === "number") state.Q = params.Q;
    if (typeof params.C === "number") state.C = params.C;
    if (typeof params.alpha === "number") state.alpha = params.alpha;
    if (typeof params.V_I === "number") state.V_I = params.V_I;
    if (typeof params.V_U === "number") state.V_U = params.V_U;
    if (typeof params.Q_star === "number") state.Q_star = params.Q_star;
    if (typeof params.strictQStar === "boolean") state.strictQStar = params.strictQStar;

    syncControlsFromState();
    onAnyChange();
  }

  function getSimulationParams() {
    return {
      P: state.P,
      Q: state.Q,
      C: state.C,
      alpha: state.alpha,
      V_I: state.V_I,
      V_U: state.V_U,
      Q_star: state.Q_star,
      strictQStar: state.strictQStar
    };
  }

  // Presets
  const presets = {
    shrink: { P: 5.25, Q: 60, C: 0.010, alpha: 0.12, V_I: 0.08, V_U: 9.0, Q_star: 60, strictQStar: true },
    normal: { P: 4.0, Q: 110, C: 0.020, alpha: 0.75, V_I: 0.08, V_U: 8.0, Q_star: 60, strictQStar: false },
    bonus: { P: 4.0, Q: 140, C: 0.020, alpha: 0.55, V_I: 0.08, V_U: 8.0, Q_star: 60, strictQStar: false }
  };

  selPreset.addEventListener("change", () => {
    const key = String(selPreset.value);
    if (key === "custom") return;
    const p = presets[key];
    if (!p) return;
    applyParamsToSimulation(p);
  });

  // Buttons
  $("btn-run").addEventListener("click", () => {
    simPhase = "running";
    setSimStatus();
    worker.postMessage({ type: "run" });
  });
  $("btn-pause").addEventListener("click", () => {
    simPhase = "paused";
    setSimStatus();
    worker.postMessage({ type: "pause" });
  });
  $("btn-reset").addEventListener("click", () => {
    simPhase = "ready";
    hasRun = false;
    setSimStatus();
    worker.postMessage({ type: "reset" });
    refreshHud();
    refreshCharts();
  });

  $("btn-optimize").addEventListener("click", () => {
    if (!cachedSweep) cachedSweep = computeSweep();
    state.Q = cachedSweep.best.Q;
    syncControlsFromState();
    onAnyChange();
  });

  $("btn-export").addEventListener("click", () => {
    if (!cachedSweep) cachedSweep = computeSweep();
    const header = [
      "Q",
      "expected_sold",
      "expected_profit",
      "margin_per_box",
      "D_i",
      "D_u",
      "D_total",
      "P",
      "C",
      "alpha",
      "V_I",
      "V_U",
      "Q_star",
      "strictQStar",
      "N"
    ];
    const rows = [header.join(",")];
    for (const [q] of cachedSweep.profitPoints) {
      const a = expectedProfit({
        P: state.P,
        Q: q,
        C: state.C,
        N: state.N,
        alpha: state.alpha,
        V_I: state.V_I,
        V_U: state.V_U,
        strictQStar: state.strictQStar,
        Q_star: state.Q_star
      });
      const s = a.shares;
      rows.push(
        [
          q,
          a.expectedSold,
          a.expectedProfitTotal,
          a.margin,
          s.dI,
          s.dU,
          s.total,
          state.P,
          state.C,
          state.alpha,
          state.V_I,
          state.V_U,
          state.Q_star,
          state.strictQStar ? 1 : 0,
          state.N
        ].join(",")
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shrink-ray-sweep_P${state.P.toFixed(2)}_alpha${state.alpha.toFixed(3)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  // change handlers
  [inpQ.input, inpP.input, inpC.input, inpAlpha.input, inpVI.input, inpVU.input, inpQStar.input, inpN.input].forEach((el) =>
    el.addEventListener("input", onAnyChange)
  );
  inpStrict.addEventListener("change", onAnyChange);
  inpSeed.addEventListener("input", onAnyChange);

  worker.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "progress" || msg.type === "done") {
      lastSim = msg;
      if (Number(msg.processed ?? 0) > 0) hasRun = true;
      if (msg.type === "done") {
        simPhase = "done";
        setSimStatus();
      }
      refreshHud();
      refreshCharts();
    }
  };

  syncControlsFromState();
  setSimStatus();
  refreshAnalytic();
  refreshHud();
  refreshCharts();
  configureWorkerImmediate();

  initTutorial({
    getSimulationParams,
    applyToSimulation: applyParamsToSimulation,
    openSimulationTab: () => setTab("simulation")
  });
}

main().catch((err) => {
  console.error(err);
  alert(String(err?.message ?? err));
});
