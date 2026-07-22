import { pathStats } from "./monteCarlo";

export type Trade = {
  entryTime: string;
  exitTime: string;
  pnl: number;
  rMultiple: number;
};

export type TradeStats = {
  nTrades: number;
  netProfit: number;
  expectancyR: number;
  profitFactor: number;
  winRate: number;
  maxDrawdown: number;
  recoveryFactor: number;
  longestLosingStreak: number;
  concentration: number;
  profitableThirds: number;
  survivesBestTradeRemoval: boolean;
  survivesTop5PctRemoval: boolean;
  tailRatio: number;
  spanDays: number;
};

export function computeTradeStats(trades: Trade[]): TradeStats {
  if (!trades.length) throw new Error("Cannot compute stats on an empty trade log.");
  const pnl = trades.map((trade) => trade.pnl);
  const r = trades.map((trade) => trade.rMultiple);
  const grossWin = pnl.filter((value) => value > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(pnl.filter((value) => value < 0).reduce((a, b) => a + b, 0));
  const maxDrawdown = pathStats(pnl).maxDrawdown;
  const netProfit = pnl.reduce((a, b) => a + b, 0);
  const wins = pnl.filter((value) => value > 0);
  const losses = pnl.filter((value) => value < 0);
  const thirds = splitThirds(trades);
  const bestRemoved = dropBest(trades, 1);
  const top5Removed = dropBest(trades, Math.max(1, Math.round(trades.length * 0.05)));

  return {
    nTrades: trades.length,
    netProfit,
    expectancyR: r.reduce((a, b) => a + b, 0) / r.length,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? Number.POSITIVE_INFINITY : 0) : grossWin / grossLoss,
    winRate: wins.length / trades.length,
    maxDrawdown,
    recoveryFactor: maxDrawdown === 0 ? (netProfit > 0 ? Number.POSITIVE_INFINITY : 0) : netProfit / maxDrawdown,
    longestLosingStreak: pathStats(pnl).longestLosingStreak,
    concentration: monthlyConcentration(trades),
    profitableThirds: thirds.filter((slice) => slice.reduce((sum, trade) => sum + trade.pnl, 0) > 0).length,
    survivesBestTradeRemoval: bestRemoved.reduce((sum, trade) => sum + trade.pnl, 0) > 0,
    survivesTop5PctRemoval: top5Removed.reduce((sum, trade) => sum + trade.pnl, 0) > 0,
    tailRatio:
      losses.length && wins.length
        ? Math.abs(avg(losses)) / Math.max(avg(wins), 0.0001)
        : Number.POSITIVE_INFINITY,
    spanDays: Math.max(
      1,
      Math.round((new Date(trades.at(-1)!.exitTime).getTime() - new Date(trades[0].entryTime).getTime()) / 86_400_000),
    ),
  };
}

export function dailyPnl(trades: Trade[]) {
  const byDay = new Map<string, number>();
  for (const trade of trades) {
    const day = trade.exitTime.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + trade.pnl);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, pnl]) => pnl);
}

function avg(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function splitThirds<T>(items: T[]) {
  const one = Math.floor(items.length / 3);
  const two = Math.floor((items.length * 2) / 3);
  return [items.slice(0, one), items.slice(one, two), items.slice(two)];
}

function dropBest(trades: Trade[], count: number) {
  const remove = new Set(
    [...trades]
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, count)
      .map((trade) => `${trade.exitTime}:${trade.pnl}`),
  );
  return trades.filter((trade) => !remove.has(`${trade.exitTime}:${trade.pnl}`));
}

function monthlyConcentration(trades: Trade[]) {
  const net = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  if (net <= 0) return 0;
  const byMonth = new Map<string, number>();
  for (const trade of trades) {
    const month = trade.exitTime.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) || 0) + trade.pnl);
  }
  return Math.max(...byMonth.values()) / net;
}
