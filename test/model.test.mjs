import test from "node:test";
import assert from "node:assert/strict";
import { demandInformed, demandUninformed, expectedProfit, marginPerBox } from "../src/model.js";

test("demandInformed matches uniform tail probability", () => {
  const P = 4;
  const Q = 100;
  const V_I = 0.08;
  const d = demandInformed({ P, Q, V_I });
  assert.ok(d > 0);
  assert.equal(d, 1 - P / (Q * V_I));
});

test("demandUninformed is zero when P >= V_U", () => {
  assert.equal(demandUninformed({ P: 10, V_U: 10 }), 0);
  assert.equal(demandUninformed({ P: 11, V_U: 10 }), 0);
});

test("expectedProfit uses strict Q* indicator when enabled", () => {
  const base = {
    P: 4,
    Q: 50,
    C: 0.01,
    N: 10000,
    alpha: 0.2,
    V_I: 0.08,
    V_U: 8
  };

  const strictOff = expectedProfit({ ...base, strictQStar: false, Q_star: 60 });
  const strictOn = expectedProfit({ ...base, strictQStar: true, Q_star: 60 });

  assert.ok(strictOff.expectedSold > 0);
  assert.equal(strictOn.expectedSold, base.N * base.alpha * demandInformed({ P: base.P, Q: base.Q, V_I: base.V_I }));
});

test("marginPerBox is linear in Q", () => {
  const P = 4;
  const C = 0.02;
  assert.equal(marginPerBox({ P, Q: 100, C }), 2);
  assert.equal(marginPerBox({ P, Q: 50, C }), 3);
});

