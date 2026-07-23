import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  rateLimit,
  readJsonLimited,
  requireActiveAccess,
} from "@/lib/server/security";
import { getVerifiedSession } from "@/lib/server/auth";
import { analyzeStrategy, projectNameFromStrategy } from "@/lib/traderlab/engine";
import { listProjects, saveProject } from "@/lib/server/store";
import { parseTradeCsv } from "@/lib/traderlab/tradeLog";
import type { StrategyProject } from "@/lib/traderlab/types";

export async function GET(request: Request) {
  const limited = rateLimit(request, "projects:get", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const accessCheck = await requireActiveAccess(session.email, session.accessToken);
  if (accessCheck.error) return accessCheck.error;

  return NextResponse.json({ projects: await listProjects(session.email, session.accessToken) });
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "projects:post", { limit: 25, windowMs: 60_000 });
  if (limited) return limited;

  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 350_000);
  if (error) return error;

  const text = typeof body?.text === "string" ? body.text.trim() : "";

  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const accessCheck = await requireActiveAccess(session.email, session.accessToken);
  if (accessCheck.error) return accessCheck.error;

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
    email: session.email,
    name: typeof body?.name === "string" && body.name.trim() ? body.name.trim() : projectNameFromStrategy(text),
    text,
    status: analysis.readiness === "ready" ? "Ready for paper validation" : "Needs fixes",
    score: analysis.score,
    plan: accessCheck.access.plan,
    analysis,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ project: await saveProject(project, session.accessToken) }, { status: 201 });
}
