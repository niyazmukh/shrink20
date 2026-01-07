import { XorShift32 } from "./rng.js";
import { expectedProfit } from "./model.js";

let config = null;
let running = false;
let rng = null;
let processed = 0;
let sold = 0;
let soldI = 0;
let soldU = 0;
let revenue = 0;
let cost = 0;
let lastEmit = 0;

function resetState(newConfig) {
  config = newConfig;
  rng = new XorShift32(config.seed >>> 0);
  processed = 0;
  sold = 0;
  soldI = 0;
  soldU = 0;
  revenue = 0;
  cost = 0;
  lastEmit = performance.now();
}

function emitProgress({ done = false } = {}) {
  const profit = revenue - cost;
  const analytic = expectedProfit({
    P: config.P,
    Q: config.Q,
    C: config.C,
    N: config.N,
    alpha: config.alpha,
    V_I: config.V_I,
    V_U: config.V_U,
    strictQStar: config.strictQStar,
    Q_star: config.Q_star
  });

  postMessage({
    type: done ? "done" : "progress",
    processed,
    N: config.N,
    sold,
    soldI,
    soldU,
    revenue,
    cost,
    profit,
    analyticSold: analytic.expectedSold,
    analyticProfit: analytic.expectedProfitTotal,
    margin: analytic.margin,
    shares: analytic.shares
  });
  lastEmit = performance.now();
}

function decideOne() {
  const informed = rng.bernoulli(config.alpha);
  if (informed) {
    const v = rng.uniform(0, config.V_I);
    if (v >= config.P / config.Q) {
      sold++;
      soldI++;
      revenue += config.P;
      cost += config.C * config.Q;
    }
    return;
  }

  const v = rng.uniform(0, config.V_U);
  if (v < config.P) return;
  if (config.strictQStar && !(config.Q > config.Q_star)) return;
  sold++;
  soldU++;
  revenue += config.P;
  cost += config.C * config.Q;
}

function loop() {
  if (!running) return;
  const start = performance.now();
  const batchSize = config.batchSize;

  while (running && processed < config.N) {
    const remaining = config.N - processed;
    const steps = remaining < batchSize ? remaining : batchSize;
    for (let i = 0; i < steps; i++) decideOne();
    processed += steps;

    const now = performance.now();
    if (now - lastEmit >= config.emitEveryMs) emitProgress();
    if (now - start >= config.yieldEveryMs) break;
  }

  if (processed >= config.N) {
    running = false;
    emitProgress({ done: true });
    return;
  }

  setTimeout(loop, 0);
}

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg.type !== "string") return;

  if (msg.type === "configure") {
    running = false;
    resetState(msg.config);
    emitProgress();
    return;
  }

  if (msg.type === "run") {
    if (!config || running) return;
    running = true;
    loop();
    return;
  }

  if (msg.type === "pause") {
    running = false;
    return;
  }

  if (msg.type === "reset") {
    if (!config) return;
    running = false;
    resetState(config);
    emitProgress();
  }
};
