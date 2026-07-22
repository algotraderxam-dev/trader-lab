// Mocked engine output used by the frontend until the AI backend is wired in.

export const SAMPLE_STRATEGY = `I trade EURUSD on the 15m. I go long when price pulls back to the 50 EMA in an uptrend and RSI shows momentum coming back. I usually take profit around 2R and cut it if it looks weak. I risk about 1-2% per trade, mostly during London session.`;

export type Rule = {
  category: "Entry" | "Exit" | "Sizing" | "Filter";
  rule: string;
  source: "explicit" | "assumed";
  note?: string;
};

export const RULES: Rule[] = [
  {
    category: "Filter",
    rule: "Trend filter: price above 200 EMA on 15m chart",
    source: "assumed",
    note: "You said “in an uptrend” — assumed 200 EMA definition. Confirm or change.",
  },
  {
    category: "Entry",
    rule: "Price touches or closes within 0.05% of the 50 EMA",
    source: "explicit",
  },
  {
    category: "Entry",
    rule: "RSI(14) crosses back above 50 after being below",
    source: "assumed",
    note: "“Momentum coming back” is not measurable. Assumed RSI(14) cross above 50.",
  },
  {
    category: "Exit",
    rule: "Take profit at 2.0R from entry",
    source: "explicit",
  },
  {
    category: "Exit",
    rule: "Stop loss: UNDEFINED — “cut it if it looks weak” cannot be automated",
    source: "assumed",
    note: "Critical gap. Suggested: stop below the pullback swing low, max 0.4% from entry.",
  },
  {
    category: "Sizing",
    rule: "Risk per trade: fixed 1.0% of account equity",
    source: "assumed",
    note: "You said 1–2%. A bot needs one number. Assumed 1% (conservative end).",
  },
  {
    category: "Filter",
    rule: "Session filter: London only, 08:00–16:30 UTC",
    source: "explicit",
  },
];

export type RiskCheck = { label: string; status: "pass" | "warn" | "fail"; detail: string };

export const RISK_CHECKS: RiskCheck[] = [
  { label: "Entry conditions fully defined", status: "pass", detail: "2 measurable entry conditions after formalization." },
  { label: "Exit conditions fully defined", status: "warn", detail: "Take-profit defined; stop-loss was vague and had to be assumed." },
  { label: "Hard stop-loss on every trade", status: "fail", detail: "“Cut it if it looks weak” is not a stop. This is the #1 account-killer." },
  { label: "Max daily loss rule", status: "fail", detail: "No circuit breaker. Suggested: halt after -3% day or 3 consecutive losses." },
  { label: "Max concurrent positions", status: "fail", detail: "Undefined. A bot will stack correlated entries without this." },
  { label: "Position sizing model", status: "warn", detail: "Range given (1–2%). Pinned to 1% — confirm." },
  { label: "Session / time filter", status: "pass", detail: "London session, explicitly defined." },
  { label: "News / event handling", status: "fail", detail: "No rule for high-impact news. EURUSD + London = ECB/CPI exposure." },
  { label: "Slippage & spread assumptions", status: "fail", detail: "Not considered. 15m EMA-touch entries are spread-sensitive." },
  { label: "Single-instrument scope", status: "pass", detail: "EURUSD only. No correlation risk in v1." },
  { label: "Overfit red flags", status: "pass", detail: "Only 3 tunable parameters. Low curve-fitting surface." },
];

export const BACKTEST_PREP = {
  params: [
    ["Instrument", "EURUSD"],
    ["Timeframe", "15m"],
    ["Data range", "Jan 2021 → present (covers trend + chop + 2022 USD run)"],
    ["In-sample / out-of-sample", "70 / 30 walk-forward, 6-month windows"],
    ["Spread assumption", "0.8 pip average, 1.5 pip during news"],
    ["Commission", "$7/lot round trip (typical ECN)"],
  ],
  metrics: [
    ["Profit factor", "Demand > 1.3 after costs — below that it's noise"],
    ["Max drawdown", "Reject if > 15% at 1% risk per trade"],
    ["Trade count", "Need 200+ trades for the result to mean anything"],
    ["Win rate × R", "At 2R targets, break-even is ~34% win rate"],
    ["Out-of-sample decay", "If OOS profit factor drops >40% vs in-sample: overfit"],
  ],
  traps: [
    "EMA-touch entries look better in backtests than live — the touch often happens on a spread spike.",
    "Don't tune RSI threshold to the data. Test 45/50/55 once, pick one, stop.",
    "London-only filter must use exchange timestamps, not your local timezone.",
  ],
};

export const ALERT_CONFIG = {
  conditions: [
    "Alert 1 — SETUP ARMED: close > EMA(200) AND low <= EMA(50) * 1.0005",
    "Alert 2 — ENTRY SIGNAL: armed AND RSI(14) crosses over 50",
    "Alert 3 — RISK HALT: strategy equity down 3% today → disable alerts",
  ],
  webhook: `{
  "event": "entry_signal",
  "symbol": "{{ticker}}",
  "side": "long",
  "price": "{{close}}",
  "stop": "{{plot_0}}",
  "target": "{{plot_1}}",
  "risk_pct": 1.0,
  "strategy": "ema50_pullback_london_v1"
}`,
};

export const PINE_SCRIPT = `//@version=5
strategy("EMA50 Pullback — London v1", overlay=true,
     initial_capital=10000, default_qty_type=strategy.percent_of_equity,
     commission_type=strategy.commission.cash_per_contract, commission_value=0.000035)

// ── Inputs from the validated rule sheet ─────────────────
emaTrendLen = input.int(200, "Trend EMA")
emaPullLen  = input.int(50,  "Pullback EMA")
rsiLen      = input.int(14,  "RSI Length")
rsiTrig     = input.int(50,  "RSI Trigger")
riskPct     = input.float(1.0, "Risk % per trade")
tpMultR     = input.float(2.0, "Take profit (R)")

// ── Session filter: London 08:00–16:30 UTC ───────────────
inLondon = not na(time(timeframe.period, "0800-1630", "UTC"))

// ── Conditions ───────────────────────────────────────────
emaTrend  = ta.ema(close, emaTrendLen)
emaPull   = ta.ema(close, emaPullLen)
rsi       = ta.rsi(close, rsiLen)

uptrend    = close > emaTrend
touchedEma = low <= emaPull * 1.0005
armed      = uptrend and touchedEma
entrySig   = armed and ta.crossover(rsi, rsiTrig) and inLondon

// ── Risk: stop at swing low, capped 0.4% from entry ──────
swingLow  = ta.lowest(low, 10)
stopPrice = math.max(swingLow, close * 0.996)
targetPx  = close + (close - stopPrice) * tpMultR

if entrySig and strategy.position_size == 0
    qty = (strategy.equity * riskPct / 100) / (close - stopPrice)
    strategy.entry("L", strategy.long, qty=qty)
    strategy.exit("X", "L", stop=stopPrice, limit=targetPx)

plot(stopPrice, "Stop", color.red, display=display.none)
plot(targetPx, "Target", color.green, display=display.none)
plot(emaTrend, "EMA 200", color.orange)
plot(emaPull, "EMA 50", color.aqua)`;

export const ROLLOUT = [
  { phase: "Week 1–2", title: "Alerts only", desc: "Run TradingView alerts. Take zero trades. Log every signal and check it matches your intent." },
  { phase: "Week 3–6", title: "Paper trade", desc: "Execute every signal on a demo account, mechanically. No overrides. Compare results to the backtest." },
  { phase: "After 30+ paper trades", title: "Your decision", desc: "If live-paper tracks the backtest within tolerance, you decide what happens next. QuantPilot never auto-executes." },
];
