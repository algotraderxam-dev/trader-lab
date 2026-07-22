import { createRng, median, percentile, pick, shuffle } from "./rng";

export type MonteCarloMethod = "bootstrap" | "shuffle";

export type MonteCarloResult = {
  method: MonteCarloMethod;
  nSimulations: number;
  nTrades: number;
  medianNetProfit: number;
  p05NetProfit: number;
  p95NetProfit: number;
  probProfitable: number;
  medianMaxDrawdown: number;
  p95MaxDrawdown: number;
  worstMaxDrawdown: number;
  medianLongestLosingStreak: number;
  p95LongestLosingStreak: number;
  riskOfRuin: number | null;
  ruinThreshold: number | null;
  drawdownMultiple: number;
};

export type MonteCarloPaths = {
  paths: number[][];
  p05: number[];
  median: number[];
  p95: number[];
  actual: number[];
  nTrades: number;
};

export function runMonteCarlo(
  pnl: number[],
  method: MonteCarloMethod,
  options: { nSimulations?: number; ruinThreshold?: number | null; seed?: number } = {},
): MonteCarloResult {
  if (pnl.length < 2) {
    throw new Error("Need at least 2 trades to run Monte Carlo.");
  }

  const nSimulations = options.nSimulations ?? 5000;
  const rng = createRng(options.seed ?? 42);
  const net: number[] = [];
  const maxDrawdowns: number[] = [];
  const streaks: number[] = [];
  let ruinCount = 0;

  for (let i = 0; i < nSimulations; i++) {
    const sample =
      method === "shuffle"
        ? shuffle(pnl, rng)
        : Array.from({ length: pnl.length }, () => pick(pnl, rng));
    const stats = pathStats(sample);
    net.push(stats.net);
    maxDrawdowns.push(stats.maxDrawdown);
    streaks.push(stats.longestLosingStreak);
    if (options.ruinThreshold && stats.maxDrawdown >= options.ruinThreshold) {
      ruinCount++;
    }
  }

  const medDd = median(maxDrawdowns);
  const p95Dd = percentile(maxDrawdowns, 0.95);

  return {
    method,
    nSimulations,
    nTrades: pnl.length,
    medianNetProfit: median(net),
    p05NetProfit: percentile(net, 0.05),
    p95NetProfit: percentile(net, 0.95),
    probProfitable: net.filter((value) => value > 0).length / net.length,
    medianMaxDrawdown: medDd,
    p95MaxDrawdown: p95Dd,
    worstMaxDrawdown: Math.max(...maxDrawdowns),
    medianLongestLosingStreak: median(streaks),
    p95LongestLosingStreak: percentile(streaks, 0.95),
    riskOfRuin: options.ruinThreshold ? ruinCount / nSimulations : null,
    ruinThreshold: options.ruinThreshold ?? null,
    drawdownMultiple: medDd > 0 ? p95Dd / medDd : Number.POSITIVE_INFINITY,
  };
}

export function runBothMonteCarlo(
  pnl: number[],
  options: { nSimulations?: number; ruinThreshold?: number | null; seed?: number } = {},
) {
  return {
    bootstrap: runMonteCarlo(pnl, "bootstrap", options),
    shuffle: runMonteCarlo(pnl, "shuffle", options),
  };
}

export function sampleMonteCarloPaths(
  pnl: number[],
  method: MonteCarloMethod = "bootstrap",
  options: { nPaths?: number; seed?: number } = {},
): MonteCarloPaths {
  if (pnl.length < 2) {
    throw new Error("Need at least 2 trades to sample paths.");
  }

  const nPaths = options.nPaths ?? 160;
  const rng = createRng(options.seed ?? 42);
  const paths: number[][] = [];

  for (let i = 0; i < nPaths; i++) {
    const sample =
      method === "shuffle"
        ? shuffle(pnl, rng)
        : Array.from({ length: pnl.length }, () => pick(pnl, rng));
    paths.push(cumulative(sample));
  }

  const actual = cumulative(pnl);
  const p05: number[] = [];
  const p50: number[] = [];
  const p95: number[] = [];

  for (let i = 0; i < pnl.length; i++) {
    const column = paths.map((path) => path[i]);
    p05.push(percentile(column, 0.05));
    p50.push(percentile(column, 0.5));
    p95.push(percentile(column, 0.95));
  }

  return { paths, p05, median: p50, p95, actual, nTrades: pnl.length };
}

export function pathStats(pnl: number[]) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let currentLosses = 0;
  let longestLosingStreak = 0;

  for (const trade of pnl) {
    equity += trade;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    if (trade < 0) {
      currentLosses++;
      longestLosingStreak = Math.max(longestLosingStreak, currentLosses);
    } else {
      currentLosses = 0;
    }
  }

  return {
    net: equity,
    maxDrawdown,
    longestLosingStreak,
  };
}

function cumulative(values: number[]) {
  const out: number[] = [];
  let total = 0;
  for (const value of values) {
    total += value;
    out.push(Number(total.toFixed(4)));
  }
  return out;
}
