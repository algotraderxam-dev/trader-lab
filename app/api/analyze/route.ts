import { NextResponse } from "next/server";
import { assertSameOrigin, rateLimit, readJsonLimited } from "@/lib/server/security";
import { analyzeStrategy } from "@/lib/traderlab/engine";
import type { Trade } from "@/lib/traderlab/metrics";
import { parseTradeCsv } from "@/lib/traderlab/tradeLog";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "analyze", { limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 350_000);
  if (error) return error;

  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (text.length < 20) {
    return NextResponse.json(
      { error: "Strategy description must be at least 20 characters." },
      { status: 400 },
    );
  }

  let parsed: ReturnType<typeof parseTradeCsv> | null = null;
  try {
    parsed = typeof body?.csv === "string" && body.csv.trim() ? parseTradeCsv(body.csv) : null;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse trade log." },
      { status: 400 },
    );
  }

  const trades = Array.isArray(body?.trades) ? normalizeTrades(body.trades) : parsed?.trades;

  return NextResponse.json({
    analysis: analyzeStrategy(text, {
      trades,
      dataWarnings: parsed?.warnings,
    }),
  });
}

function normalizeTrades(value: unknown[]): Trade[] {
  return value
    .map((trade) => {
      if (!trade || typeof trade !== "object") return null;
      const candidate = trade as Partial<Trade>;
      if (
        typeof candidate.entryTime !== "string" ||
        typeof candidate.exitTime !== "string" ||
        typeof candidate.pnl !== "number" ||
        typeof candidate.rMultiple !== "number"
      ) return null;
      return candidate as Trade;
    })
    .filter((trade): trade is Trade => Boolean(trade));
}
