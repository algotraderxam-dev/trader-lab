# Claude Review Prompt For QuantPilot

You are reviewing QuantPilot, a sellable MVP for an AI agent workspace that validates a trader's strategy before automation.

The product promise:

- The trader brings their own strategy.
- QuantPilot turns strategy text plus optional trade-log CSV into explicit rules, risk gates, Monte Carlo odds, prop-firm challenge odds, Pine Script draft, webhook JSON, and a shareable report.
- QuantPilot does not provide signals, execute trades, connect to brokers, or promise profit.

Please review the product like a skeptical senior engineer and quant tooling reviewer.

## Files To Review First

- `README.md`
- `ENGINE_REVIEW.md`
- `lib/traderlab/compiler.ts`
- `lib/traderlab/engine.ts`
- `lib/traderlab/metrics.ts`
- `lib/traderlab/monteCarlo.ts`
- `lib/traderlab/propFirm.ts`
- `lib/traderlab/tradeLog.ts`
- `lib/traderlab/types.ts`
- `app/api/analyze/route.ts`
- `app/api/monte-carlo/route.ts`
- `app/api/projects/route.ts`
- `app/api/reports/[id]/route.ts`
- `app/app/page.tsx`
- `app/report/[id]/page.tsx`
- `mcp/quantpilot-mcp.mjs`

## Review Questions

1. Are the Monte Carlo and prop-firm simulations mathematically sane for an MVP?
2. Where could the engine accidentally overstate confidence or make misleading claims?
3. Are all assumption-based outputs clearly labeled as assumptions?
4. What edge cases can break CSV parsing or trade-log statistics?
5. Are the generated Pine Script and webhook payloads clearly drafts, not execution promises?
6. What needs to be fixed before charging users through Whop?
7. What should be moved from frontend/demo behavior into backend persistence next?
8. What are the top five bugs or product risks, ranked by severity?

## Local Test Commands

```bash
npm run build
npm run dev -- -p 3001
curl -s http://localhost:3001/api/health
curl -s -X POST http://localhost:3001/api/demo-projects/seed \
  -H 'Content-Type: application/json' \
  --data '{"email":"review@quantpilot.local"}'
```

## Important Product Boundaries

- No signals.
- No broker execution.
- No profit promises.
- No claim that prop-firm presets are current unless verified against official firm rules.
- Paid-grade reports should prefer uploaded trade logs or real backtest data over assumption-generated trades.
