import { NextResponse } from "next/server";
import { assertSameOrigin, rateLimit, readJsonLimited } from "@/lib/server/security";
import { sampleMonteCarloPaths, runBothMonteCarlo } from "@/lib/traderlab/monteCarlo";
import { FIRM_PRESETS, simulateChallenge, solvePositionSize } from "@/lib/traderlab/propFirm";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "monte-carlo", { limit: 35, windowMs: 60_000 });
  if (limited) return limited;

  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 250_000);
  if (error) return error;

  const pnl = Array.isArray(body?.pnl) ? body.pnl.map(Number).filter(Number.isFinite) : [];
  const dailyPnl = Array.isArray(body?.dailyPnl) ? body.dailyPnl.map(Number).filter(Number.isFinite) : [];
  const firmId = typeof body?.firm === "string" ? body.firm : "topstep_50k";
  const firm = FIRM_PRESETS[firmId] || FIRM_PRESETS.topstep_50k;
  const ruinThreshold = typeof body?.ruinThreshold === "number" ? body.ruinThreshold : firm.maxDrawdown;

  if (pnl.length < 2) {
    return NextResponse.json({ error: "pnl must contain at least 2 trade results." }, { status: 400 });
  }

  const monteCarlo = runBothMonteCarlo(pnl, {
    nSimulations: clampInt(body?.nSimulations, 200, 10_000, 5000),
    ruinThreshold,
    seed: clampInt(body?.seed, 1, 999_999, 42),
  });
  const paths = sampleMonteCarloPaths(pnl, "bootstrap", {
    nPaths: clampInt(body?.nPaths, 20, 300, 120),
    seed: clampInt(body?.seed, 1, 999_999, 42) + 1,
  });
  const challengeDaily = dailyPnl.length >= 5 ? dailyPnl : chunkTradesIntoDays(pnl, 3);
  const challenge = simulateChallenge(challengeDaily, firm, {
    nSimulations: clampInt(body?.challengeSimulations, 200, 10_000, 5000),
    horizonDays: clampInt(body?.horizonDays, 5, 120, firm.maxTradingDays || 60),
    seed: clampInt(body?.seed, 1, 999_999, 42),
  });
  const sizeSolution = solvePositionSize(challengeDaily, firm, {
    nSimulations: 1500,
    horizonDays: clampInt(body?.horizonDays, 5, 120, firm.maxTradingDays || 60),
    seed: clampInt(body?.seed, 1, 999_999, 42) + 2,
  });

  return NextResponse.json({ monteCarlo, paths, challenge, sizeSolution });
}

function chunkTradesIntoDays(pnl: number[], tradesPerDay: number) {
  const days: number[] = [];
  for (let i = 0; i < pnl.length; i += tradesPerDay) {
    days.push(pnl.slice(i, i + tradesPerDay).reduce((a, b) => a + b, 0));
  }
  return days;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
