import { createRng, median, percentile, pick } from "./rng";

export type ChallengeOutcome =
  | "pass"
  | "fail_daily_loss"
  | "fail_max_drawdown"
  | "fail_consistency"
  | "timeout";

export type FirmRules = {
  id: string;
  name: string;
  accountSize: number;
  profitTarget: number;
  maxDrawdown: number;
  dailyLossLimit: number | null;
  trailing: boolean;
  trailLocksAtStart: boolean;
  minTradingDays: number;
  maxTradingDays: number;
  consistencyPct: number | null;
  verified: boolean;
};

export type ChallengeResult = {
  firm: FirmRules;
  nSimulations: number;
  nSourceDays: number;
  passRate: number;
  failRate: number;
  outcomes: Record<ChallengeOutcome, number>;
  medianDaysToPass: number | null;
  medianDaysToFail: number | null;
  p05Final: number;
  medianFinal: number;
  p95Final: number;
};

export const FIRM_PRESETS: Record<string, FirmRules> = {
  topstep_50k: {
    id: "topstep_50k",
    name: "Topstep 50K Combine",
    accountSize: 50_000,
    profitTarget: 3_000,
    maxDrawdown: 2_000,
    dailyLossLimit: 1_000,
    trailing: true,
    trailLocksAtStart: true,
    minTradingDays: 2,
    maxTradingDays: 60,
    consistencyPct: null,
    verified: false,
  },
  apex_50k: {
    id: "apex_50k",
    name: "Apex 50K Evaluation",
    accountSize: 50_000,
    profitTarget: 3_000,
    maxDrawdown: 2_500,
    dailyLossLimit: null,
    trailing: true,
    trailLocksAtStart: false,
    minTradingDays: 1,
    maxTradingDays: 60,
    consistencyPct: null,
    verified: false,
  },
  ftmo_100k: {
    id: "ftmo_100k",
    name: "FTMO 100K Challenge",
    accountSize: 100_000,
    profitTarget: 10_000,
    maxDrawdown: 10_000,
    dailyLossLimit: 5_000,
    trailing: false,
    trailLocksAtStart: true,
    minTradingDays: 4,
    maxTradingDays: 30,
    consistencyPct: null,
    verified: false,
  },
  tpt_50k: {
    id: "tpt_50k",
    name: "Take Profit Trader 50K",
    accountSize: 50_000,
    profitTarget: 3_000,
    maxDrawdown: 2_000,
    dailyLossLimit: 1_100,
    trailing: true,
    trailLocksAtStart: true,
    minTradingDays: 5,
    maxTradingDays: 60,
    consistencyPct: null,
    verified: false,
  },
};

export function simulateChallenge(
  dailyPnl: number[],
  rules: FirmRules,
  options: { nSimulations?: number; horizonDays?: number; seed?: number } = {},
): ChallengeResult {
  if (dailyPnl.length < 5) {
    throw new Error(`Need at least 5 trading days to simulate, got ${dailyPnl.length}.`);
  }

  const nSimulations = options.nSimulations ?? 10_000;
  const horizonDays = options.horizonDays ?? (rules.maxTradingDays || 60);
  const rng = createRng(options.seed ?? 42);
  const outcomes: ChallengeOutcome[] = [];
  const lengths: number[] = [];
  const finals: number[] = [];

  for (let i = 0; i < nSimulations; i++) {
    const draws = Array.from({ length: horizonDays }, () => pick(dailyPnl, rng));
    const result = runOneChallenge(draws, rules);
    outcomes.push(result.outcome);
    lengths.push(result.days);
    finals.push(result.finalEquityDelta);
  }

  const counts = outcomeShares(outcomes);
  const passLengths = lengths.filter((_, i) => outcomes[i] === "pass");
  const failLengths = lengths.filter((_, i) => outcomes[i] !== "pass");
  const passRate = counts.pass || 0;

  return {
    firm: rules,
    nSimulations,
    nSourceDays: dailyPnl.length,
    passRate,
    failRate: 1 - passRate,
    outcomes: counts,
    medianDaysToPass: passLengths.length ? median(passLengths) : null,
    medianDaysToFail: failLengths.length ? median(failLengths) : null,
    p05Final: percentile(finals, 0.05),
    medianFinal: median(finals),
    p95Final: percentile(finals, 0.95),
  };
}

export function solvePositionSize(
  dailyPnl: number[],
  rules: FirmRules,
  options: { targetPassRate?: number; nSimulations?: number; horizonDays?: number; seed?: number } = {},
) {
  const targetPassRate = options.targetPassRate ?? 0.8;
  let best = { multiplier: null as number | null, passRate: 0 };

  for (const multiplier of [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25]) {
    const scaled = dailyPnl.map((value) => value * multiplier);
    const result = simulateChallenge(scaled, rules, {
      nSimulations: options.nSimulations ?? 2000,
      horizonDays: options.horizonDays,
      seed: options.seed,
    });

    if (result.passRate > best.passRate) {
      best = { multiplier, passRate: result.passRate };
    }

    if (result.passRate >= targetPassRate) {
      return { multiplier, passRate: result.passRate, targetPassRate };
    }
  }

  return { multiplier: null, passRate: best.passRate, targetPassRate };
}

export function describeFirm(rules: FirmRules) {
  return [
    `target $${rules.profitTarget.toLocaleString()}`,
    `max DD $${rules.maxDrawdown.toLocaleString()}${rules.trailing ? " trailing" : " static"}`,
    rules.dailyLossLimit ? `daily loss $${rules.dailyLossLimit.toLocaleString()}` : null,
    rules.minTradingDays ? `min ${rules.minTradingDays} days` : null,
    rules.consistencyPct ? `consistency ${(rules.consistencyPct * 100).toFixed(0)}%` : null,
  ].filter(Boolean).join(" · ");
}

function runOneChallenge(dayDraws: number[], rules: FirmRules) {
  let equity = 0;
  let peak = 0;
  let floor = -rules.maxDrawdown;
  const dayProfits: number[] = [];

  for (let i = 0; i < dayDraws.length; i++) {
    const day = dayDraws[i];
    const dayNumber = i + 1;

    if (rules.dailyLossLimit !== null && day <= -rules.dailyLossLimit) {
      return { outcome: "fail_daily_loss" as ChallengeOutcome, days: dayNumber, finalEquityDelta: equity + day };
    }

    equity += day;
    dayProfits.push(day);

    if (equity <= floor) {
      return { outcome: "fail_max_drawdown" as ChallengeOutcome, days: dayNumber, finalEquityDelta: equity };
    }

    if (equity > peak) {
      peak = equity;
      if (rules.trailing) {
        let trailed = peak - rules.maxDrawdown;
        if (rules.trailLocksAtStart) trailed = Math.min(trailed, 0);
        floor = Math.max(floor, trailed);
      }
    }

    if (equity >= rules.profitTarget && dayNumber >= rules.minTradingDays) {
      if (rules.consistencyPct !== null && equity > 0) {
        const bestDay = Math.max(...dayProfits);
        if (bestDay / equity > rules.consistencyPct) continue;
      }
      return { outcome: "pass" as ChallengeOutcome, days: dayNumber, finalEquityDelta: equity };
    }

    if (rules.maxTradingDays && dayNumber >= rules.maxTradingDays) {
      return { outcome: "timeout" as ChallengeOutcome, days: dayNumber, finalEquityDelta: equity };
    }
  }

  return { outcome: "timeout" as ChallengeOutcome, days: dayDraws.length, finalEquityDelta: equity };
}

function outcomeShares(outcomes: ChallengeOutcome[]) {
  const counts: Record<ChallengeOutcome, number> = {
    pass: 0,
    fail_daily_loss: 0,
    fail_max_drawdown: 0,
    fail_consistency: 0,
    timeout: 0,
  };

  for (const outcome of outcomes) counts[outcome]++;
  for (const key of Object.keys(counts) as ChallengeOutcome[]) {
    counts[key] = counts[key] / outcomes.length;
  }
  return counts;
}
