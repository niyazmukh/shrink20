export function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function demandInformed({ P, Q, V_I }) {
  if (Q <= 0 || V_I <= 0) return 0;
  return Math.max(0, 1 - P / (Q * V_I));
}

export function demandUninformed({ P, V_U }) {
  if (V_U <= 0) return 0;
  return Math.max(0, 1 - P / V_U);
}

export function uninformedNoticeIndicator({ Q, Q_star }) {
  return Q > Q_star ? 1 : 0;
}

export function unitPrice({ P, Q }) {
  return Q <= 0 ? Infinity : P / Q;
}

export function marginPerBox({ P, Q, C }) {
  return P - C * Q;
}

export function expectedShares({ P, Q, alpha, V_I, V_U, strictQStar = false, Q_star = 0 }) {
  const a = clamp01(alpha);
  const dI = demandInformed({ P, Q, V_I });
  const dU0 = demandUninformed({ P, V_U });
  const indicator = strictQStar ? uninformedNoticeIndicator({ Q, Q_star }) : 1;
  const dU = dU0 * indicator;
  const total = a * dI + (1 - a) * dU;
  return { dI, dU, total };
}

export function expectedProfit({ P, Q, C, N, alpha, V_I, V_U, strictQStar = false, Q_star = 0 }) {
  const margin = marginPerBox({ P, Q, C });
  const shares = expectedShares({ P, Q, alpha, V_I, V_U, strictQStar, Q_star });
  const expectedSold = N * shares.total;
  const expectedProfitTotal = expectedSold * margin;
  return { expectedSold, expectedProfitTotal, margin, shares };
}

export function percentError(simValue, expectedValue) {
  if (!Number.isFinite(expectedValue) || expectedValue === 0) return NaN;
  return ((simValue - expectedValue) / expectedValue) * 100;
}

