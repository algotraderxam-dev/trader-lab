export type CompiledStrategy = {
  name: string;
  symbol: string;
  assetClass: "futures" | "forex" | "crypto";
  timeframe: "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
  strategyType: "ema_pullback" | "vwap_reversion" | "liquidity_reversal" | "breakout" | "mean_reversion" | "generic";
  side: "long" | "short" | "both";
  session: "asia" | "london" | "new_york" | "ny_open" | "any";
  indicators: string[];
  conditions: string[];
  entryTrigger: {
    primary: string;
    confirmation: string[];
    quality: "strict" | "usable" | "vague";
  };
  stop: {
    kind: "structure" | "atr" | "fixed_points" | "percent";
    value: number;
    source: "explicit" | "inferred";
  };
  target: {
    kind: "rr" | "fixed_points" | "percent";
    value: number;
    source: "explicit" | "inferred";
  };
  risk: {
    riskPerTradePct: number;
    maxTradesPerDay: number;
    dailyLossCapPct: number;
    source: "explicit" | "inferred";
  };
  automation: {
    alertNames: string[];
    blockers: string[];
    assumptions: string[];
  };
  statsAssumptions: {
    winRate: number;
    avgWinR: number;
    avgLossR: number;
    nTrades: number;
  };
  notes: string[];
};

const SYMBOLS: Array<[RegExp, string, CompiledStrategy["assetClass"]]> = [
  [/\b(nq|nasdaq)\b/i, "NQ", "futures"],
  [/\b(es|s&p)\b/i, "ES", "futures"],
  [/\b(mnq)\b/i, "MNQ", "futures"],
  [/\b(eurusd)\b/i, "EURUSD", "forex"],
  [/\b(gbpusd)\b/i, "GBPUSD", "forex"],
  [/\b(xauusd|gold)\b/i, "XAUUSD", "forex"],
  [/\b(btc|bitcoin)\b/i, "BTCUSDT", "crypto"],
  [/\b(eth|ethereum)\b/i, "ETHUSDT", "crypto"],
];

const TIMEFRAMES: Array<[RegExp, CompiledStrategy["timeframe"]]> = [
  [/\b(1m|1 min|m1)\b/i, "1m"],
  [/\b(5m|5 min|m5)\b/i, "5m"],
  [/\b(15m|15 min|m15)\b/i, "15m"],
  [/\b(30m|30 min|m30)\b/i, "30m"],
  [/\b(1h|hourly|h1)\b/i, "1h"],
  [/\b(4h|h4)\b/i, "4h"],
  [/\b(1d|daily)\b/i, "1d"],
];

export function compileStrategy(text: string): CompiledStrategy {
  const lower = text.toLowerCase();
  const market = SYMBOLS.find(([pattern]) => pattern.test(text));
  const timeframe = TIMEFRAMES.find(([pattern]) => pattern.test(text))?.[1] || "15m";
  const side = lower.includes("short") || lower.includes("sell") || lower.includes("bearish")
    ? lower.includes("long") || lower.includes("buy") || lower.includes("bullish") ? "both" : "short"
    : "long";
  const session = lower.includes("asia") || lower.includes("asian")
    ? "asia"
    : lower.includes("new york open") || lower.includes("ny open")
      ? "ny_open"
      : lower.includes("new york") || lower.includes("ny")
        ? "new_york"
        : lower.includes("london")
          ? "london"
          : "any";
  const indicators = detectIndicators(lower);
  const strategyType = detectStrategyType(lower, indicators);
  const conditions = detectConditions(lower, side);
  const stop = inferStop(lower, conditions);
  const target = inferTarget(lower);
  const riskValue = extractNumber(lower, /(?:risk|risking)\s*(\d+(?:\.\d+)?)\s*%/);
  const dailyLossValue = extractNumber(lower, /(?:daily loss|daily halt|max daily)\D*(\d+(?:\.\d+)?)\s*%/);
  const maxTradesValue = extractNumber(lower, /(?:max|maximum)?\s*(\d+)\s*trades?\s*(?:per|\/)\s*day/);
  const riskPerTradePct = riskValue ?? 0.5;
  const dailyLossCapPct = dailyLossValue ?? 3;
  const maxTradesPerDay = maxTradesValue ?? 3;
  const rr = target.kind === "rr" ? target.value : 2;
  const explicitWinRate = extractNumber(lower, /(?:win rate|wr)\D*(\d+(?:\.\d+)?)\s*%/);
  const entryTrigger = buildEntryTrigger(strategyType, conditions, indicators);
  const blockers = buildAutomationBlockers(lower, conditions, session, riskValue, stop.source);
  const assumptions = buildAssumptions(market?.[1], timeframe, session, stop, target, riskValue, dailyLossValue, maxTradesValue);

  return {
    name: `${market?.[1] || "Strategy"} ${timeframe} ${session === "any" ? "" : session.replace("_", " ")}`.trim(),
    symbol: market?.[1] || "NQ",
    assetClass: market?.[2] || "futures",
    timeframe,
    strategyType,
    side,
    session,
    indicators,
    conditions,
    entryTrigger,
    stop,
    target,
    risk: {
      riskPerTradePct,
      maxTradesPerDay,
      dailyLossCapPct,
      source: riskValue || dailyLossValue || maxTradesValue ? "explicit" : "inferred",
    },
    automation: {
      alertNames: buildAlertNames(strategyType),
      blockers,
      assumptions,
    },
    statsAssumptions: {
      winRate: explicitWinRate ?? (conditions.length >= 4 ? 46 : conditions.length >= 2 ? 42 : 38),
      avgWinR: rr,
      avgLossR: 1,
      nTrades: 180,
    },
    notes: [
      "Compiled with deterministic rules. LLM generation can be added later, but this spec is schema-like data, not executable AI code.",
      market ? "Market detected from description." : "Market was not explicit; defaulted to NQ futures.",
      conditions.length ? "Entry conditions were detected." : "Entry is vague; user must pin the trigger before real backtesting.",
    ],
  };
}

export function buildPineFromSpec(spec: CompiledStrategy) {
  const isShort = spec.side === "short";
  const directionExpr = trendExpression(spec, isShort);
  const sessionExpr = spec.session === "any" ? "true" : "not na(time(timeframe.period, sessionInput))";
  const confirmationExpr = confirmationExpression(spec, isShort);
  const stopLine =
    spec.stop.kind === "atr"
      ? `stopDistance = ta.atr(14) * ${spec.stop.value}`
      : spec.stop.kind === "percent"
        ? `stopDistance = close * ${spec.stop.value / 100}`
        : spec.stop.kind === "fixed_points"
          ? `stopDistance = ${spec.stop.value}`
          : isShort
            ? "stopDistance = math.abs(ta.highest(high, 10) - close)"
            : "stopDistance = math.abs(close - ta.lowest(low, 10))";
  const setupExpr = setupExpression(spec, isShort);
  const targetMultiplier = spec.target.kind === "rr" ? spec.target.value : 2;

  return `//@version=5
strategy("QuantPilot ${spec.name} blueprint", overlay=true, initial_capital=50000, pyramiding=0)

sessionInput = input.session("0800-1200", "Active session")
initialCapital = input.float(50000, "Initial capital", minval=1000)
riskPct = input.float(${spec.risk.riskPerTradePct}, "Risk % per trade", minval=0.1, maxval=5)
dailyLossCapPct = input.float(${spec.risk.dailyLossCapPct}, "Daily halt %", minval=0.5, maxval=10)
maxTradesPerDay = input.int(${spec.risk.maxTradesPerDay}, "Max trades per day", minval=1, maxval=20)

emaFast = ta.ema(close, 20)
emaSlow = ta.ema(close, 50)
rsiValue = ta.rsi(close, 14)
vwapValue = ta.vwap(hlc3)
atrValue = ta.atr(14)
trendUp = emaFast > emaSlow
trendDown = emaFast < emaSlow
newDay = ta.change(time("D")) != 0
var float dayStartNet = na
var int tradesToday = 0
if newDay
    dayStartNet := strategy.netprofit
    tradesToday := 0
if na(dayStartNet)
    dayStartNet := strategy.netprofit
dailyLossPct = math.max(0, (dayStartNet - strategy.netprofit) / initialCapital * 100)
dailyHalt = dailyLossPct >= dailyLossCapPct
${stopLine}
targetDistance = stopDistance * ${targetMultiplier}

sessionOk = ${sessionExpr}
setupOk = ${setupExpr}
entryOk = sessionOk and not dailyHalt and tradesToday < maxTradesPerDay and ${directionExpr} and ${confirmationExpr} and setupOk

if entryOk and strategy.opentrades == 0
    strategy.entry("TL ${isShort ? "short" : "long"}", strategy.${isShort ? "short" : "long"})
    tradesToday += 1

if strategy.position_size ${isShort ? "<" : ">"} 0
    stopPrice = strategy.position_avg_price ${isShort ? "+" : "-"} stopDistance
    targetPrice = strategy.position_avg_price ${isShort ? "-" : "+"} targetDistance
    strategy.exit("TL exit", stop=stopPrice, limit=targetPrice)

alertcondition(entryOk, "TL entry setup", "QuantPilot entry setup confirmed")
alertcondition(dailyHalt, "TL daily halt", "QuantPilot daily loss halt active")
alertcondition(strategy.position_size ${isShort ? "<" : ">"} 0, "TL position active", "QuantPilot position is active")

plot(emaFast, "EMA 20", color=color.new(color.blue, 0))
plot(emaSlow, "EMA 50", color=color.new(color.white, 0))
plot(vwapValue, "VWAP", color=color.new(color.purple, 35))`;
}

function detectStrategyType(lower: string, indicators: string[]): CompiledStrategy["strategyType"] {
  if (/\bbreakout|break out|range high|range low|opening range|orb\b/.test(lower)) return "breakout";
  if (/\bsweep|liquidity grab|raid|fvg|fair value gap|imbalance|choch|bos\b/.test(lower)) return "liquidity_reversal";
  if (indicators.includes("vwap") && /\breversion|mean|fade|return to|back to\b/.test(lower)) return "vwap_reversion";
  if (/\bmean reversion|overbought|oversold|fade\b/.test(lower)) return "mean_reversion";
  if (indicators.includes("ema") || /\bpullback|dip|retest\b/.test(lower)) return "ema_pullback";
  return "generic";
}

function buildEntryTrigger(
  strategyType: CompiledStrategy["strategyType"],
  conditions: string[],
  indicators: string[],
): CompiledStrategy["entryTrigger"] {
  const primary = {
    ema_pullback: "Trend-aligned pullback into the moving average zone.",
    vwap_reversion: "Reversion setup around VWAP after an extension.",
    liquidity_reversal: "Liquidity sweep or imbalance confirmation before reversal.",
    breakout: "Break and hold beyond a defined range or structure level.",
    mean_reversion: "Overextended price reverting toward fair value.",
    generic: "Trader-defined setup from the strategy description.",
  }[strategyType];
  const confirmation = [
    ...conditions,
    ...(indicators.includes("rsi") ? ["RSI momentum confirmation"] : []),
    ...(indicators.includes("atr") ? ["ATR volatility filter"] : []),
  ];
  return {
    primary,
    confirmation,
    quality: confirmation.length >= 4 ? "strict" : confirmation.length >= 2 ? "usable" : "vague",
  };
}

function buildAutomationBlockers(
  lower: string,
  conditions: string[],
  session: CompiledStrategy["session"],
  riskValue: number | null,
  stopSource: "explicit" | "inferred",
) {
  const blockers: string[] = [];
  if (!conditions.length) blockers.push("Entry trigger is not explicit enough for automation.");
  if (stopSource === "inferred") blockers.push("Stop-loss was inferred; user must confirm invalidation logic.");
  if (!riskValue) blockers.push("Risk per trade was inferred; user must confirm sizing.");
  if (session === "any") blockers.push("Session window is missing.");
  if (!/exit|target|tp|take profit|\dr\b/.test(lower)) blockers.push("Exit/target wording needs confirmation.");
  return blockers;
}

function buildAssumptions(
  symbol: string | undefined,
  timeframe: CompiledStrategy["timeframe"],
  session: CompiledStrategy["session"],
  stop: CompiledStrategy["stop"],
  target: CompiledStrategy["target"],
  riskValue: number | null,
  dailyLossValue: number | null,
  maxTradesValue: number | null,
) {
  const assumptions: string[] = [];
  if (!symbol) assumptions.push("Symbol defaulted to NQ because no market was detected.");
  assumptions.push(`Timeframe compiled as ${timeframe}.`);
  if (session === "any") assumptions.push("Session defaulted to always-on until user pins a trading window.");
  if (stop.source === "inferred") assumptions.push(`Stop model inferred as ${stop.kind}.`);
  if (target.source === "inferred") assumptions.push(`${target.value}R target inferred.`);
  if (!riskValue) assumptions.push("Risk per trade defaulted to 0.5%.");
  if (!dailyLossValue) assumptions.push("Daily loss halt defaulted to 3%.");
  if (!maxTradesValue) assumptions.push("Max trades/day defaulted to 3.");
  return assumptions;
}

function buildAlertNames(strategyType: CompiledStrategy["strategyType"]) {
  return [
    `${strategyType}_entry_setup`,
    "stop_loss_attached",
    "target_attached",
    "daily_halt_checked",
    "max_trades_checked",
    "session_filter_passed",
  ];
}

function trendExpression(spec: CompiledStrategy, isShort: boolean) {
  if (spec.strategyType === "mean_reversion" || spec.strategyType === "vwap_reversion") return "true";
  return isShort ? "trendDown" : "trendUp";
}

function confirmationExpression(spec: CompiledStrategy, isShort: boolean) {
  const filters = ["true"];
  if (spec.indicators.includes("rsi")) filters.push(isShort ? "rsiValue < 50" : "rsiValue > 50");
  if (spec.indicators.includes("vwap") && spec.strategyType !== "vwap_reversion") {
    filters.push(isShort ? "close < vwapValue" : "close > vwapValue");
  }
  if (spec.indicators.includes("atr")) filters.push("atrValue > ta.sma(atrValue, 20) * 0.75");
  return filters.join(" and ");
}

function setupExpression(spec: CompiledStrategy, isShort: boolean) {
  switch (spec.strategyType) {
    case "breakout":
      return isShort ? "close < ta.lowest(low, 20)[1]" : "close > ta.highest(high, 20)[1]";
    case "liquidity_reversal":
      return isShort
        ? "high > ta.highest(high, 10)[1] and close < open"
        : "low < ta.lowest(low, 10)[1] and close > open";
    case "vwap_reversion":
      return isShort
        ? "close > vwapValue + atrValue and close < close[1]"
        : "close < vwapValue - atrValue and close > close[1]";
    case "mean_reversion":
      return isShort ? "rsiValue > 70 and close < close[1]" : "rsiValue < 30 and close > close[1]";
    case "ema_pullback":
      return isShort ? "high >= emaSlow and close < emaSlow" : "low <= emaSlow and close > emaSlow";
    default:
      return isShort ? "close < emaSlow" : "close > emaSlow";
  }
}

function detectIndicators(lower: string) {
  const out = new Set<string>();
  if (/\bema|moving average|ma\b/.test(lower)) out.add("ema");
  if (/\bsma\b/.test(lower)) out.add("sma");
  if (/\brsi\b/.test(lower)) out.add("rsi");
  if (/\bvwap\b/.test(lower)) out.add("vwap");
  if (/\batr\b/.test(lower)) out.add("atr");
  if (/\bfvg|fair value gap|imbalance\b/.test(lower)) out.add("fvg");
  if (/\bsweep|liquidity|raid\b/.test(lower)) out.add("liquidity_sweep");
  if (/\bsmt|divergence\b/.test(lower)) out.add("smt");
  return [...out];
}

function detectConditions(lower: string, side: CompiledStrategy["side"]) {
  const bullish = side !== "short";
  const out: string[] = [];
  if (/\bsweep|liquidity grab|raid|take/.test(lower)) out.push(bullish ? "Sweep sell-side liquidity" : "Sweep buy-side liquidity");
  if (/\bfvg|fair value gap|imbalance\b/.test(lower)) out.push(bullish ? "Bullish FVG is present" : "Bearish FVG is present");
  if (/\bema|moving average|ma\b/.test(lower)) out.push(bullish ? "Price trades above moving average" : "Price trades below moving average");
  if (/\brsi\b/.test(lower)) out.push("RSI confirms momentum");
  if (/\bvwap\b/.test(lower)) out.push(bullish ? "Price is above VWAP" : "Price is below VWAP");
  if (/\bbos|break of structure|choch|market structure\b/.test(lower)) out.push(bullish ? "Bullish structure break" : "Bearish structure break");
  return out;
}

function inferStop(lower: string, conditions: string[]): CompiledStrategy["stop"] {
  const fixed = extractNumber(lower, /stop\D*(\d+(?:\.\d+)?)\s*(?:points|pts|pips)/);
  if (fixed) return { kind: "fixed_points", value: fixed, source: "explicit" };
  const pct = extractNumber(lower, /stop\D*(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { kind: "percent", value: pct, source: "explicit" };
  const atr = extractNumber(lower, /(\d+(?:\.\d+)?)\s*x?\s*atr/);
  if (atr) return { kind: "atr", value: atr, source: "explicit" };
  return { kind: conditions.some((c) => c.toLowerCase().includes("sweep") || c.toLowerCase().includes("structure")) ? "structure" : "atr", value: 1.5, source: "inferred" };
}

function inferTarget(lower: string): CompiledStrategy["target"] {
  const rr = extractNumber(lower, /(?:target|tp|take profit)?\D*(\d+(?:\.\d+)?)\s*r\b/);
  if (rr) return { kind: "rr", value: rr, source: "explicit" };
  return { kind: "rr", value: 2, source: "inferred" };
}

function extractNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}
