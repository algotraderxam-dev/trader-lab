import { NextResponse } from "next/server";
import { assertSameOrigin, rateLimit, readJsonLimited } from "@/lib/server/security";
import { computeTradeStats, dailyPnl } from "@/lib/traderlab/metrics";
import { parseTradeCsv } from "@/lib/traderlab/tradeLog";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "trade-log", { limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 500_000);
  if (error) return error;

  const csv = typeof body?.csv === "string" ? body.csv : "";

  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
  }

  try {
    const parsed = parseTradeCsv(csv);
    return NextResponse.json({
      trades: parsed.trades,
      warnings: parsed.warnings,
      columns: parsed.columns,
      stats: computeTradeStats(parsed.trades),
      dailyPnl: dailyPnl(parsed.trades),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse trade log." },
      { status: 400 },
    );
  }
}
