import { buildPineFromSpec, compileStrategy } from "./compiler";
import { computeTradeStats, dailyPnl, type Trade } from "./metrics";
import { runBothMonteCarlo, sampleMonteCarloPaths } from "./monteCarlo";
import { FIRM_PRESETS, describeFirm, simulateChallenge, solvePositionSize } from "./propFirm";
import { createRng } from "./rng";
import type { AnalysisRule, RiskGate, StrategyAnalysis } from "./types";

export function analyzeStrategy(input: string, options: { trades?: Trade[]; dataWarnings?: string[] } = {}): StrategyAnalysis {
  const text = input.trim();
  const spec = compileStrategy(text);
  const dataMode = options.trades?.length ? "trade_log" : "assumption";
  const trades = options.trades?.length ? options.trades : generateAssumptionTradeLog(spec);
  const dataWarnings = options.dataWarnings || [];
  const stats = computeTradeStats(trades);
  const pnl = trades.map((trade) => trade.pnl);
  const account = firmForSpec(spec.symbol).accountSize;
  const riskDollars = account * (spec.risk.riskPerTradePct / 100);
  const ruinThreshold = firmForSpec(spec.symbol).maxDrawdown;
  const mc = runBothMonteCarlo(pnl, { nSimulations: 5000, ruinThreshold, seed: 42 });
  const paths = sampleMonteCarloPaths(pnl, "bootstrap", { nPaths: 12, seed: 7 });
  const firm = firmForSpec(spec.symbol);
  const challenge = simulateChallenge(dailyPnl(trades), firm, { nSimulations: 5000, horizonDays: firm.maxTradingDays || 60, seed: 42 });
  const sizeSolution = solvePositionSize(dailyPnl(trades), firm, { nSimulations: 1500, seed: 43 });
  const gates = buildRiskGates(text, spec, stats, dataMode);
  const score = scoreReadiness(gates, stats, mc.bootstrap.probProfitable, challenge.passRate, dataMode);
  const readiness = score >= 82 ? "ready" : score >= 64 ? "needs_review" : "blocked";
  const missing = gates.filter((gate) => gate.status === "fail").map((gate) => gate.label.toLowerCase());
  const pineScript = buildPineFromSpec(spec);

  return {
    score,
    readiness,
    detectedMarket: `${spec.symbol} ${spec.assetClass}`,
    dataMode,
    dataWarnings: [
      ...dataWarnings,
      ...spec.automation.assumptions.map((assumption) => `Compiler assumption: ${assumption}`),
    ],
    compiledSpec: {
      name: spec.name,
      symbol: spec.symbol,
      timeframe: spec.timeframe,
      strategyType: spec.strategyType,
      side: spec.side,
      session: spec.session,
      entryQuality: spec.entryTrigger.quality,
      automationBlockers: spec.automation.blockers,
      assumptions: spec.automation.assumptions,
    },
    summary:
      dataMode === "trade_log"
        ? `The strategy was evaluated against ${trades.length} uploaded trades. Monte Carlo and prop-firm odds use that trade distribution.`
        : readiness === "ready"
        ? "The strategy is structured enough for paper validation, but results are still assumption-based until a real trade log or backtest feed is attached."
        : `The strategy needs ${missing.slice(0, 2).join(" and ") || "risk"} clarified before automation.`,
    rules: buildRules(spec),
    riskGates: gates,
    monteCarlo: {
      preset: firm.name,
      passProbability: pct(challenge.passRate),
      ruinProbability: pct((challenge.outcomes.fail_daily_loss || 0) + (challenge.outcomes.fail_max_drawdown || 0)),
      timeoutProbability: pct(challenge.outcomes.timeout || 0),
      suggestedRiskPct:
        sizeSolution.multiplier === null
          ? Number((spec.risk.riskPerTradePct * 0.25).toFixed(2))
          : Number((spec.risk.riskPerTradePct * sizeSolution.multiplier).toFixed(2)),
      medianDays: challenge.medianDaysToPass ? Math.round(challenge.medianDaysToPass) : 0,
      medianDrawdownR: Number((mc.shuffle.p95MaxDrawdown / Math.max(riskDollars, 1)).toFixed(1)),
      engine: {
        source: "Claude engine port",
        assumptions: [
          dataMode === "trade_log"
            ? "Monte Carlo and prop-firm simulation use the uploaded trade log."
            : "No broker/data feed connected yet; trade log is generated from declared win rate, R target, and risk.",
          "Monte Carlo uses bootstrap and shuffle resampling with fixed seeds.",
          "Prop-firm odds resample daily P&L and walk the challenge rules day by day.",
          "Firm presets are marked unverified until checked against current firm documentation.",
        ],
        bootstrap: mc.bootstrap,
        shuffle: mc.shuffle,
        paths,
        challenge: {
          ...challenge,
          firmDescription: describeFirm(firm),
          sizeSolution,
        },
        stats,
      },
    },
    blueprint: {
      alerts: spec.automation.alertNames,
      webhookPayload: JSON.stringify(
        {
          product: "QuantPilot",
          event: "strategy_alert",
          spec_version: "engine-v2",
          symbol: spec.symbol,
          timeframe: spec.timeframe,
          strategy_type: spec.strategyType,
          side: spec.side,
          session: spec.session,
          risk_pct: spec.risk.riskPerTradePct,
          max_trades_per_day: spec.risk.maxTradesPerDay,
          daily_loss_cap_pct: spec.risk.dailyLossCapPct,
          entry_quality: spec.entryTrigger.quality,
          data_mode: dataMode,
          action: "{{strategy.order.action}}",
          price: "{{close}}",
          time: "{{time}}",
        },
        null,
        2,
      ),
      pineScript,
      rollout: [
        "Confirm every compiled rule before running historical validation.",
        dataMode === "trade_log"
          ? "Review uploaded trade-log evidence and verify the sample is representative."
          : "Attach real OHLCV/backtest data and replace assumption-based trades.",
        "Paper trade at least 30 alerts with webhook logging enabled.",
        "Compare live-paper behavior against Monte Carlo drawdown tolerance.",
        "Only then decide whether the automation package is production-ready.",
      ],
    },
    report: {
      title: `${spec.name} validation`,
      version: "engine-v1",
      findings: [
        `Readiness score: ${score}/100.`,
        `Compiled as ${spec.strategyType.replace(/_/g, " ")} on ${spec.symbol} ${spec.timeframe}.`,
        `Entry trigger quality: ${spec.entryTrigger.quality}.`,
        `Bootstrap chance of profit: ${pct(mc.bootstrap.probProfitable)}%.`,
        `Shuffle p95 drawdown: $${Math.round(mc.shuffle.p95MaxDrawdown).toLocaleString()}; size from this, not the best backtest curve.`,
        `Prop-firm simulation: ${pct(challenge.passRate)}% pass, ${pct(challenge.failRate)}% fail/timeout on ${firm.name}.`,
        `Trade evidence: ${stats.nTrades} trades, ${pct(stats.winRate)}% win rate, ${round(stats.expectancyR)}R expectancy, ${formatProfitFactor(stats.profitFactor)} profit factor.`,
        dataMode === "trade_log" ? `Data source: uploaded trade log with ${trades.length} trades.` : "Data source: assumption-based generated trade log.",
        firm.verified ? "Firm preset verified." : "Firm preset is unverified and must be checked before showing paid users.",
        ...spec.automation.blockers.map((blocker) => `Automation blocker: ${blocker}`),
      ],
      nextActions:
        readiness === "ready"
          ? ["Attach real market/trade data.", "Run backend backtest.", "Export Pine and webhook package."]
          : ["Pin missing risk gates.", "Create a stricter strategy version.", "Rerun engine analysis."],
      evidence: {
        dataSource: dataMode,
        trades: stats.nTrades,
        winRate: pct(stats.winRate),
        expectancyR: round(stats.expectancyR),
        profitFactor: Number.isFinite(stats.profitFactor) ? round(stats.profitFactor) : 999,
        maxDrawdown: Math.round(stats.maxDrawdown),
        spanDays: stats.spanDays,
      },
    },
  };
}

export function projectNameFromStrategy(text: string) {
  return compileStrategy(text).name;
}

function buildRules(spec: ReturnType<typeof compileStrategy>): AnalysisRule[] {
  return [
    {
      category: "Entry",
      rule: spec.entryTrigger.primary,
      source: spec.entryTrigger.quality === "vague" ? "assumed" : "detected",
    },
    ...spec.conditions.map((condition): AnalysisRule => ({
      category: "Entry",
      rule: condition,
      source: "detected",
    })),
    {
      category: "Exit",
      rule: `Target is ${spec.target.kind === "rr" ? `${spec.target.value}R` : `${spec.target.value} ${spec.target.kind}`}.`,
      source: spec.target.source === "explicit" ? "detected" : "assumed",
    },
    {
      category: "Sizing",
      rule: `Risk ${spec.risk.riskPerTradePct}% per trade, max ${spec.risk.maxTradesPerDay} trades/day.`,
      source: spec.risk.source === "explicit" ? "detected" : "assumed",
    },
    {
      category: "Filter",
      rule: `Compiled strategy type: ${spec.strategyType.replace(/_/g, " ")}.`,
      source: "detected",
    },
    {
      category: "Session",
      rule: spec.session === "any" ? "Session is not pinned." : `Only trade ${spec.session.replace("_", " ")} session.`,
      source: spec.session === "any" ? "missing" : "detected",
    },
  ];
}

function buildRiskGates(
  text: string,
  spec: ReturnType<typeof compileStrategy>,
  stats: ReturnType<typeof computeTradeStats>,
  dataMode: "assumption" | "trade_log",
): RiskGate[] {
  const lower = text.toLowerCase();
  return [
    gate("Entry logic", spec.conditions.length > 0, "The strategy must define exactly when a trade is allowed."),
    gate("Exit / target logic", spec.target.value > 0, "Targets or exit conditions must be explicit before testing."),
    gate("Hard stop-loss", spec.stop.source === "explicit" || /stop|sl|invalid|atr|structure|swing/.test(lower), "Automation is blocked until the invalidation point is defined."),
    gate("Position sizing", spec.risk.source === "explicit" || /risk|size|sizing|%/.test(lower), "Risk per trade must be known for Monte Carlo and prop-firm odds."),
    gate("Session filter", spec.session !== "any", "Session boundaries reduce ambiguity in historical testing."),
    {
      label: "Entry quality",
      status: spec.entryTrigger.quality === "strict" ? "pass" : spec.entryTrigger.quality === "usable" ? "warn" : "fail",
      detail: `Compiled trigger quality is ${spec.entryTrigger.quality}.`,
    },
    {
      label: dataMode === "trade_log" ? "Sample size" : "Assumption quality",
      status: dataMode === "trade_log" ? (stats.nTrades >= 100 ? "pass" : "fail") : "warn",
      detail:
        dataMode === "trade_log"
          ? `${stats.nTrades} uploaded trades. Paid-grade validation needs at least 100 trades.`
          : "Current engine can simulate from assumptions, but a paid-grade report should attach real trades or OHLCV.",
    },
  ];
}

function gate(label: string, passed: boolean, detail: string): RiskGate {
  return { label, status: passed ? "pass" : "fail", detail };
}

function scoreReadiness(
  gates: RiskGate[],
  stats: ReturnType<typeof computeTradeStats>,
  probProfitable: number,
  challengePassRate: number,
  dataMode: "assumption" | "trade_log",
) {
  const gateScore = gates.reduce((sum, gate) => sum + (gate.status === "pass" ? 10 : gate.status === "warn" ? 5 : 0), 0);
  const edgeScore = Math.max(0, Math.min(20, stats.expectancyR * 40));
  const stabilityScore = Math.max(0, Math.min(10, probProfitable * 10));
  const challengeScore = Math.max(0, Math.min(10, challengePassRate * 12));
  const score = Math.round(Math.min(94, gateScore + edgeScore + stabilityScore + challengeScore));
  if (dataMode === "trade_log" && stats.nTrades < 100) return Math.min(score, 54);
  return score;
}

function generateAssumptionTradeLog(spec: ReturnType<typeof compileStrategy>): Trade[] {
  const rng = createRng(hashString(`${spec.name}:${spec.statsAssumptions.winRate}:${spec.risk.riskPerTradePct}`));
  const trades: Trade[] = [];
  const start = new Date("2025-01-06T09:30:00.000Z");
  const riskDollars = firmForSpec(spec.symbol).accountSize * (spec.risk.riskPerTradePct / 100);
  let lossCluster = 0;

  for (let i = 0; i < spec.statsAssumptions.nTrades; i++) {
    const dayOffset = Math.floor(i / Math.max(1, spec.risk.maxTradesPerDay));
    const entry = new Date(start.getTime() + dayOffset * 86_400_000 + (i % spec.risk.maxTradesPerDay) * 60 * 60 * 1000);
    const exit = new Date(entry.getTime() + 45 * 60 * 1000);
    const clusterPenalty = lossCluster > 0 ? 0.08 : 0;
    const isWin = rng() < spec.statsAssumptions.winRate / 100 - clusterPenalty;
    const jitter = 0.75 + rng() * 0.5;
    const rMultiple = Number((isWin ? spec.statsAssumptions.avgWinR * jitter : -spec.statsAssumptions.avgLossR * jitter).toFixed(3));
    lossCluster = isWin ? 0 : Math.min(3, lossCluster + 1);
    trades.push({
      entryTime: entry.toISOString(),
      exitTime: exit.toISOString(),
      pnl: Number((rMultiple * riskDollars).toFixed(2)),
      rMultiple,
    });
  }

  return trades;
}

function firmForSpec(symbol: string) {
  if (symbol.includes("EUR") || symbol.includes("XAU")) return FIRM_PRESETS.ftmo_100k;
  if (symbol.includes("NQ") || symbol.includes("ES")) return FIRM_PRESETS.topstep_50k;
  return FIRM_PRESETS.apex_50k;
}

function pct(value: number) {
  return Math.round(value * 1000) / 10;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function formatProfitFactor(value: number) {
  if (!Number.isFinite(value)) return "infinite";
  return `${round(value)}`;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
