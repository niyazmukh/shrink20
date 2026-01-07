# Shrink Ray vs. 20% Free Model - Interactive Web Simulation

This repo is a small, dependency-free web app that implements the "Shrink Ray" quantity-choice model (uniform closed-form) and an agent-based simulation that converges to analytic expectations.

## Attribution

The underlying model is credited to Yefim Roth, Vlad Streltsin, and Eitan Gerstner.

## Run Online

[**Click here to run the simulation**](https://niyaz.me/shrink20/)

## Run Locally

1. Start a local web server in this directory (e.g., using Python or VS Code Live Server):
   - `python -m http.server 5173`
   - or `npx serve .`
2. Open `http://localhost:5173`

## Fidelity notes

- Informed buyers: buy if `V_i >= P/Q` with `V_i ~ U[0, V_I]` => `D_i(Q) = max(0, 1 - P/(Q*V_I))`
- Uninformed buyers: buy if `V_u >= P` with `V_u ~ U[0, V_U]` => `D_u(P) = max(0, 1 - P/V_U)`
- Toggle **Strict behavioral mode** to multiply the uninformed term by `1{Q > Q*}` (notice-threshold interpretation).
- Profit per sold box: `P - C*Q`

## In-app tools

- Expected profit sweep vs `Q` (with "Set Q to argmax")
- Demand decomposition chart (informed / uninformed / total)
- CSV export for the analytic sweep
