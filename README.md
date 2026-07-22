# QuantPilot

AI agent workspace for validating a trader's strategy before automation.

QuantPilot turns raw strategy text plus an optional trade log into:

- Structured rules and risk gates
- Strategy readiness score
- Trade-log or assumption-based Monte Carlo
- Prop-firm pass, ruin, timeout, and sizing odds
- TradingView Pine Script draft
- Webhook payload
- Shareable report JSON/text

QuantPilot does not place trades, connect to brokers, sell signals, or promise profit.

## Local

```bash
npm install
npm run dev -- -p 3001
```

Open `http://localhost:3001`.

Main product surfaces:

- `/` - premium landing page
- `/checkout?plan=research` - $79 local/Whop access flow
- `/checkout?plan=pro` - $199 local/Whop access flow
- `/app?module=overview` - logged-in workspace dashboard
- `/report/:id` - public validation report page for a saved project

## MCP

QuantPilot includes a lightweight local MCP bridge for Claude Code, Codex, Cursor,
and other MCP clients.

```bash
npm run dev -- -p 3001
npm run mcp
```

Example MCP client config:

```json
{
  "mcpServers": {
    "quantpilot": {
      "command": "node",
      "args": ["/Users/dior/traderlab/mcp/quantpilot-mcp.mjs"],
      "env": {
        "QUANTPILOT_APP_URL": "http://localhost:3001"
      }
    }
  }
}
```

MCP tools:

- `analyze_strategy`
- `parse_trade_log`
- `list_projects`
- `get_report`
- `seed_demo_projects`

## Important Routes

- `POST /api/analyze` - strategy text plus optional CSV trade log
- `POST /api/trade-log` - parse CSV trade logs
- `POST /api/monte-carlo` - backend Monte Carlo and prop-firm simulations
- `GET/POST /api/projects` - save and list strategy projects
- `GET /api/reports/:id` - shareable report payload
- `POST /api/demo-projects/seed` - seed three engine-generated demo projects
- `POST /api/checkout` - local test activation now, Whop redirect when env IDs are configured
- `GET /report/:id` - public report page for sales/proof links

## Security MVP

- Security headers are applied through `proxy.ts`: content-type sniffing blocked, framing denied, referrer policy set, browser permissions restricted, and a same-origin CSP enabled.
- Mutating API routes enforce same-origin browser requests, request body size limits, and per-IP in-memory rate limits.
- Project list, save, update, delete, and demo seeding require active QuantPilot access from `/api/access`.
- Project updates require the submitted email to match the saved project owner.
- Shareable report routes are intentionally public because report links are part of the sales workflow.

## Sellable MVP Flow

1. Visitor lands on `/` and sees QuantPilot as an AI agent workspace.
2. Visitor chooses Research ($79) or Pro ($199) and enters email.
3. Checkout route stores local access now, or redirects to Whop when product IDs exist.
4. Workspace opens on `/app?module=overview`.
5. User loads demo workspace or pastes a strategy and optional CSV trade log.
6. Backend engine creates readiness score, rules, risk gates, Monte Carlo odds, Pine draft, webhook JSON, and report evidence.
7. User shares `/report/:id` or exports report JSON/text.

## Whop Setup

Copy `.env.example` to `.env.local` and fill:

```bash
WHOP_RESEARCH_PRODUCT_ID=
WHOP_PRO_PRODUCT_ID=
```

When a product ID exists, `/api/checkout` returns a Whop checkout URL. Without IDs,
it keeps local test activation for development.

## Engine Files

- `lib/traderlab/compiler.ts` - deterministic strategy compiler and Pine generator
- `lib/traderlab/engine.ts` - readiness, report, Monte Carlo, prop-firm, blueprint orchestration
- `lib/traderlab/tradeLog.ts` - CSV parser
- `lib/traderlab/monteCarlo.ts` - bootstrap/shuffle simulations
- `lib/traderlab/propFirm.ts` - prop-firm challenge simulation and size solver
