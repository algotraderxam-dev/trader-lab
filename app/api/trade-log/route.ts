import { NextResponse } from "next/server";
import { computeTradeStats, dailyPnl } from "@/lib/traderlab/metrics";
import { parseTradeCsv } from "@/lib/traderlab/tradeLog";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
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
