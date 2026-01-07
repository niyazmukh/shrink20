# PRD — Shrink Ray Model Interactive Web Simulation (Roguelike)

## 0) One‑liner

A web-based, model-dedicated interactive experience that teaches the “Shrink Ray” quantity-choice model in plain language and then lets users **play** a top‑down roguelike simulation where thousands of individual buyers decide whether to purchase—making the model’s predictions visible and testable.

---

## 1) Background and objectives

### 1.1 Model context (plain)

A manufacturer keeps the **sticker price** per box (P) constant but chooses **quantity in the box** (Q). This changes the **unit price** (P/Q). Customers come in two types:

* **Informed** customers: care about unit price, buy if their per‑unit value exceeds P/Q.
* **Uninformed** customers: care about sticker price, buy if their box value exceeds P, and (optionally) if shrink isn’t noticeable (Q > Q*).

The manufacturer’s expected profit is:

* **Margin per sold box**: P − C·Q
* **Times** probability a random customer buys (mixture of informed and uninformed).

### 1.2 Product goals

1. **Teach** the model step-by-step in plain language, with interactive controls and “show me why” visuals.
2. **Simulate at scale** using agent-based buyers in a roguelike top‑down world, letting users see emergent outcomes and compare to the analytic model.
3. Provide a **bridge** between micro decisions (individual agents) and macro results (demand curves, expected profit, regime shifts).

### 1.3 Success criteria (KPIs)

* Users can correctly answer (in-app quizzes) what happens to informed demand when Q decreases.
* Users can reproduce the two-regime behavior (shrink-ray vs normal) by tuning α or β.
* Simulation outcomes align with analytic predictions within tolerance (e.g., demand/profit within ±2–5% for large N and uniform assumptions).
* Engagement: median session > 6 minutes; >40% users enter simulation after tutorial.

### 1.4 Model-fidelity contract (precision requirements)

To represent the paper’s model **with formula-level precision**, the product must explicitly separate (A) what is assumed in the analytic derivations and (B) optional gameplay extensions.

**A. Core analytic model (uniform closed-form)**

* Values:

  * Informed: Vi ~ Uniform[0, V_I]
  * Uninformed: Vu ~ Uniform[0, V_U]
* Purchase probabilities (uniform tails):

  * Informed demand share: D_i(Q) = max(0, 1 − P/(Q·V_I))
  * Uninformed demand share: D_u(P) = max(0, 1 − P/V_U)
* Expected profit (paper-style Eq. 3 using uniform tails):

  * Π(Q) = (P − C·Q) · [ α·D_i(Q) + (1−α)·D_u(P) ]
* Demand-regime boundary used in the paper:

  * If Q ≤ P/V_I then D_i(Q)=0 (informed demand collapses).

**B. Q* (notice threshold) handling must be explicit**
The paper describes a notice threshold Q*, but its simplified profit expression does not always carry it as an explicit indicator. The product must therefore offer two clearly-labeled fidelity modes:

* **Strict behavioral mode:** uninformed term multiplied by 1{Q > Q*}.
* **Paper simplification mode:** uses D_u(P) without the 1{Q > Q*} factor.

**C. Derived thresholds (α^c, β^c, λ)**

* α^c and β^c are computed from the paper’s uniform closed-form assumptions.
* The shrink-ray threshold λ visualization must be labeled as derived under additional simplifying assumptions used in the paper (e.g., the specific boundary choice for Q* when comparing endpoint cases).

Any roguelike modifiers, probabilistic noticing, learning of α, etc. are **extensions** and must never be presented as “the model” unless toggled into an “extended dynamics” mode.

---

## 2) Target users & user stories

### 2.1 Personas

* **Learner / Student**: wants intuition and a memorable explanation.
* **Researcher / Economist**: wants faithful formulas, parameter sweeps, exportable plots.
* **Policy / Consumer advocacy**: wants to explore conditions where shrink-ray emerges.
* **Engineer / Product manager**: wants a “toy world” demonstration and interactive storytelling.

### 2.2 Core user stories

* As a learner, I want the model explained in simple steps, each with a slider and a “what changes?” callout.
* As a researcher, I want to run a sweep over α (or β) and export CSV of outcomes.
* As a user, I want to watch thousands of buyers navigate a world and decide, so the model feels real.
* As an instructor, I want a “guided mode” with pauses and checkpoints.

---

## 3) Experience design: Two-part structure

## Part 1 — Interactive explanation (step-by-step)

### 3.1 Information architecture

A left-to-right “chapter” flow with progress:

1. **The product**: P, Q, unit price P/Q
2. **Two buyer types**: informed vs uninformed
3. **Values & distributions**: Vi and Vu; why distributions
4. **Buying rules**: thresholds and tail probabilities
5. **Expected profit**: margin × purchase probability
6. **Uniform case**: closed-form demand and profit
7. **Two regimes**: degenerate (shrink-ray) vs normal
8. **β reparameterization**: potential-customer informed share
9. **Shrink-ray threshold**: λ and its intuition
10. **Try-it sandbox**: a mini-sim (small N) to preview Part 2

### 3.2 Interaction pattern for each chapter

Each chapter uses a consistent template:

* **Plain-language statement** (1–3 sentences)
* **One interactive control** (slider/toggle)
* **Immediate visual** (chart + small world vignette)
* **“In one line” math** (optional expandable)
* **Checkpoint question** (single multiple-choice)

### 3.3 Visual components

* **Unit price dial**: shows P, Q, and P/Q changing.
* **Population bars**: α vs (1−α) split.
* **Value distribution strip**: uniform distribution on [0, V_I] or [0, V_U].
* **Tail highlight**: shaded area above a cutoff (P/Q or P).
* **Demand/profit chart**: live-updating.
* **Regime indicator**: “Normal Market” vs “Shrink Ray” with explanation.

### 3.4 Copy principles

* Avoid jargon; define each symbol once.
* Always connect to a concrete sentence:

  * “This integral is just the fraction of people whose value is above the cutoff.”
* Use micro stories:

  * “Informed buyers check price-per-gram like they check gasoline price per liter.”

### 3.5 Accessibility & pedagogy

* Keyboard support for all sliders.
* Captions / alt-text for visual explanations.
* Optional “math mode” panel for users who want full formulas.

---

## Part 2 — Roguelike top‑down simulation (agent-based, at scale)

### 3.6 High-level concept

A top-down world (like a roguelike town + market) where buyers wander, inspect products, and decide to purchase. The manufacturer (the user) controls Q (and optionally P) and sees the market response.

### 3.7 World & art direction

* **Top-down 2D tiles** (16×16 or 32×32 tiles, clean minimal style).
* “Marketplace” hub with multiple storefronts.
* Buyers are simple sprites with icons indicating type:

  * Informed: magnifying-glass icon
  * Uninformed: price-tag icon

### 3.8 Core simulation loop

Each tick/frame:

1. Spawn / route buyers toward shops.
2. Buyers may **inspect** product(s) (informed check unit price; uninformed check sticker price and “notice shrink” probability/threshold).
3. Each buyer decides buy/not buy.
4. Purchases update revenue, costs, and metrics.
5. The world persists as a “run” (roguelike session) with events and noise.

### 3.9 Agent model (buyers)

Each buyer has:

* Type: informed (with probability α) or uninformed (1−α).
* Drawn value:

  * Informed: Vi ~ Distribution_I (default Uniform[0, V_I])
  * Uninformed: Vu ~ Distribution_U (default Uniform[0, V_U])
* Awareness / noticing rule:

  * Base model: uninformed buys only if Q > Q*
  * Optional extension: probabilistic noticing when Q drops below Q* (for richer gameplay)
* Decision:

  * Informed: buy if Vi > P/Q
  * Uninformed: buy if Vu > P and (Q > Q* or not-noticed)

### 3.10 Product & firm model

* Parameters:

  * P: sticker price
  * Q: quantity per box (chosen by user)
  * C: unit cost
  * Q*: “notice threshold”
  * V_I, V_U: value upper bounds (uniform)
  * α: informed share (or β in advanced mode)
* Profit accounting:

  * Per sale margin = P − C·Q
  * Total profit = sum over sales

### 3.11 Roguelike “run” structure

Each run is 3–10 minutes, with:

* **Floors / days**: each “day” introduces a modifier (e.g., more informed shoppers, higher cost, shock to V_U).
* **Random events** (optional):

  * “Blog post goes viral”: α increases
  * “Inflation squeeze”: V_U decreases
  * “Supply chain”: C increases
* **Meta progression** (optional, can be disabled for academic mode): unlock new distribution families or visualization tools.

### 3.12 Modes

* **Sandbox mode (academic)**: no roguelike modifiers, deterministic parameter set, fast compute.
* **Roguelike mode (game)**: events, noise, goals (reach profit target, survive days).
* **Compare mode**: show analytic expectation vs simulated outcome in real time.

---

## 4) Key features (MVP vs V1)

### 4.1 MVP (must-have)

**Part 1: Interactive explanation**

* Chapter flow 1–8 (through two regimes).
* Sliders: P, Q, C, α, V_I, V_U, Q*.
* Tail shading for demand and live profit chart.
* Mini-sim preview with 200 agents.

**Part 2: Simulation**

* Top-down map with at least 1 marketplace.
* Spawn 5k–20k agents (aggregate compute decoupled from render).
* Agents decide buy/not buy using the model rules.
* Dashboard: total buyers, buyers by type, conversion rates, revenue, cost, profit.
* Pause / step / speed (1×, 5×, 20×).
* “Change Q” control mid-run and observe dynamics.
* “Compare to analytic” toggle (shows predicted purchase rates/profit for current parameters).

### 4.2 V1 (should-have)

* β-mode (reparameterization) with visual explanation.
* λ threshold view: highlight region where shrink-ray is optimal.
* Parameter sweep tool (run 100–500 scenarios) and export CSV.
* Multiple shops / competitors (optional abstraction): retailer layer.
* Additional distributions: Normal, lognormal, truncated normal.
* Probabilistic noticing function for shrink detection.

### 4.3 V2 (nice-to-have)

* Multiplayer “classroom” session where instructor sets parameters.
* Save/share runs via URL-encoded configs.
* Replay system with timeline scrubber.
* Advanced: endogenous learning where α increases when Q falls (word-of-mouth).

---

## 5) UX flows

### 5.1 Landing page

* Hero: “Shrink Ray: Why packages shrink without price changes.”
* Two CTAs:

  * “Learn the model” (Part 1)
  * “Run the simulation” (Part 2)

### 5.2 Part 1 flow

* Scroll/step chapters with progress bar.
* At each chapter: slider + immediate visual + 1 question.
* Completion unlocks “Simulation run” button + recommended presets.

### 5.3 Part 2 flow

* Choose mode (Sandbox / Roguelike / Compare).
* Select preset scenario (e.g., High α vs Low α).
* Enter world; HUD shows controls and metrics.
* End-of-run report: charts + comparison to analytic + export.

---

## 6) Simulation architecture (how to do scale + visuals)

### 6.1 Decouple computation from rendering

* Rendering needs ~60 FPS for a few hundred visible agents.
* Computation needs to handle thousands to millions of buyer decisions.

Approach:

* **Render layer**: show ~200–500 representative agents (sampled).
* **Compute layer**: simulate all agents’ decisions in batches.

  * Option A: Web Worker (JS) for CPU batch simulation.
  * Option B: WASM module (Rust) for high performance.

### 6.2 Data model

* Config object: {P, Q, C, Q*, alpha, V_I, V_U, dist types, seed}
* Agent arrays:

  * types[] (bool informed)
  * vi[] (float, only for informed)
  * vu[] (float, only for uninformed)
* Metrics:

  * counts: total, informed, uninformed
  * buyers: total, informed, uninformed
  * profit components: revenue, cost, profit

### 6.3 Determinism

* Use seeded RNG so runs are reproducible.
* Provide “fixed seed” option for academic comparisons.

### 6.4 Analytic comparator

* For uniform assumptions, compute closed-form demand/profit in real time.
* Display difference:

  * “Simulated profit: X | Expected profit: Y | Error: Z%”

---

## 7) Parameter design & presets

### 7.1 Core parameters (always visible)

* Q (quantity)
* P (price)
* α (informed share)
* C (unit cost)

### 7.2 Advanced (accordion)

* Q* (notice threshold)
* V_I, V_U (value scale)
* Distribution family selectors
* β-mode toggle (with conversion to α)

### 7.3 Presets

* “Shrink Ray likely”: low α, high uninformed buy share.
* “Normal market”: high α.
* “Cost shock”: high C.
* “Value shock”: low V_U.

---

## 8) Visualizations & dashboards

### 8.1 In-sim HUD (always)

* Current Q, P, P/Q
* Sales count, conversion %, profit
* Type breakdown

### 8.2 Analytics panel (toggle)

* Demand curves: informed demand vs Q, uninformed demand vs P.
* Profit vs Q chart; highlight current Q.
* Regime indicator: if Q < P/V_I then informed demand ≈ 0.

### 8.3 End-of-run report

* Timeline charts (profit over time, conversion over time).
* Histogram of Vi/Vu (optional).
* Export buttons: CSV, PNG.

---

## 9) Content & microcopy (examples)

* “Lower Q saves cost, but raises unit price. Informed buyers are the first to leave.”
* “Tail probability = the share of people whose value is above the price they face.”
* “Shrink Ray regime: you’ve effectively stopped selling to informed shoppers.”

---

## 10) Tech stack (recommended)

* Frontend: React + TypeScript
* Rendering: PixiJS or Phaser (2D top-down), or Canvas/WebGL directly
* Charts: Recharts (React)
* Compute: Web Worker + typed arrays; optional WASM (Rust) for speed
* Hosting: static (Vercel/Netlify)

---

## 11) Performance targets

* 60 FPS render with 300 visible agents.
* Compute: 50k–500k agent decisions per second on desktop via worker.
* Sweeps: 200 scenarios in <10 seconds (desktop target).

---

## 12) QA & validation

### 12.1 Model validation

* Unit tests that compare simulation aggregates to analytic formulas under uniform assumptions.
* Edge cases:

  * P >= V_U (uninformed demand zero)
  * Q very small / very large
  * α = 0 and α = 1

### 12.2 UX validation

* Tutorial comprehension quiz completion.
* First-run friction: time-to-first-sim < 60 seconds.

---

## 13) Risks & mitigations

* **Risk:** Users confuse box price vs unit price.

  * Mitigation: persistent “unit price” badge and side-by-side price display.
* **Risk:** Performance bottlenecks at large N.

  * Mitigation: decouple render; worker batching; optional WASM.
* **Risk:** Model mismatch (Q* not in formula).

  * Mitigation: explicit toggle: “Strict model (indicator Q>Q*)” vs “Paper simplification.”

---

## 14) Milestones

### M0 (1–2 weeks)

* Wireframes + copy for Part 1 chapters.
* Decide render engine.

### M1 (2–4 weeks)

* Implement Part 1 interactive explanation.
* Implement analytic calculator.

### M2 (2–5 weeks)

* Implement roguelike world + agent spawn + decision engine in worker.
* HUD + metrics.

### M3 (1–2 weeks)

* Compare mode + end-of-run report + export.
* Polish + accessibility.

---

## 15) Open questions (to resolve during design)

* Do we allow users to change P, or keep P fixed and only tune Q (closer to shrink-ray narrative)?
* Should Q* be a hard threshold or probabilistic noticing curve?
* Is retailer competition in-scope, or do we keep a single representative store?
* Target audience: classroom/research vs public education (affects tone and gamification).
