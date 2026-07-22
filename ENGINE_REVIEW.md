# QuantPilot Engine Review Notes

QuantPilot is currently focused on the product engine, not payments. Whop will be used later for access/billing.

## What Was Ported From The Claude Engine

Source references found locally:

- `/Users/dior/cotrader/engine/montecarlo.py`
- `/Users/dior/cotrader/engine/propfirm.py`
- `/Users/dior/cotrader/engine/metrics.py`
- `/Users/dior/cotrader/engine/grader.py`
- `/Users/dior/cotrader/engine/strategy/spec.py`
- `/Users/dior/cotrader/engine/agents/compiler.py`

The TypeScript backend now mirrors the important architecture:

- Bootstrap Monte Carlo: resamples trades with replacement to test whether the edge survives new samples.
- Shuffle Monte Carlo: permutes the same trades to test path/order risk and p95 drawdown.
- Prop-firm challenge simulation: resamples daily P&L and walks the account through challenge rules day by day.
- Size solver: tests smaller position-size multipliers to find whether pass probability can be improved.
- Compiler: plain-English strategy description becomes structured strategy data.
- Pine generator: strategy spec becomes a Pine v5 blueprint, not live execution code.

## Engine Files

- `lib/traderlab/compiler.ts`
- `lib/traderlab/engine.ts`
- `lib/traderlab/metrics.ts`
- `lib/traderlab/monteCarlo.ts`
- `lib/traderlab/propFirm.ts`
- `lib/traderlab/rng.ts`
- `lib/traderlab/types.ts`

## API Routes

- `POST /api/analyze`
  - Input: `{ "text": "strategy description" }`
  - Output: compiled rules, readiness score, Monte Carlo summary, prop-firm odds, webhook JSON, Pine draft, report findings.

- `POST /api/monte-carlo`
  - Input: `{ "pnl": [...], "dailyPnl": [...], "firm": "topstep_50k" }`
  - Output: bootstrap/shuffle Monte Carlo, sampled paths, prop-firm simulation, size solution.

- `POST /api/projects`
  - Saves a strategy plus its generated analysis.

- `GET /api/reports/:id`
  - Exports saved analysis as report JSON.

## Current Honest Limitation

The engine can run from a real trade log through `/api/monte-carlo`, but `/api/analyze` still generates an assumption-based trade log from the plain-English strategy. That is useful for demo/onboarding, but paid-grade reports should attach one of these next:

- uploaded CSV trade log,
- TradingView backtest export,
- OHLCV data feed plus backend backtest runner.

Every user-facing report should label whether numbers are:

- assumption-based,
- trade-log based,
- real OHLCV backtest based.

## Payment Direction

Do not build Stripe first. User wants Whop. Payment/access should be added after engine review.
