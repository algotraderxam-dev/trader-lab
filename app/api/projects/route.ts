import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { analyzeStrategy, projectNameFromStrategy } from "@/lib/traderlab/engine";
import { listProjects, saveProject } from "@/lib/server/store";
import { parseTradeCsv } from "@/lib/traderlab/tradeLog";
import type { Plan, StrategyProject } from "@/lib/traderlab/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ projects: [] });
  }

  return NextResponse.json({ projects: await listProjects(email) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const plan = normalizePlan(body?.plan);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required to save a project." }, { status: 400 });
  }

  if (text.length < 20) {
    return NextResponse.json({ error: "Strategy description is too short." }, { status: 400 });
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

  const now = new Date().toISOString();
  const analysis = analyzeStrategy(text, { trades: parsed?.trades, dataWarnings: parsed?.warnings });
  const project: StrategyProject = {
    id: randomUUID(),
    email,
    name: typeof body?.name === "string" && body.name.trim() ? body.name.trim() : projectNameFromStrategy(text),
    text,
    status: analysis.readiness === "ready" ? "Ready for paper validation" : "Needs fixes",
    score: analysis.score,
    plan,
    analysis,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ project: await saveProject(project) }, { status: 201 });
}

function normalizePlan(value: unknown): Plan {
  return value === "research" || value === "pro" ? value : "demo";
}
