import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  rateLimit,
  readJsonLimited,
  requireActiveAccess,
} from "@/lib/server/security";
import { getVerifiedSession } from "@/lib/server/auth";
import { listProjects, saveProject } from "@/lib/server/store";
import { DEMO_STRATEGIES } from "@/lib/traderlab/demoStrategies";
import { analyzeStrategy } from "@/lib/traderlab/engine";
import { parseTradeCsv } from "@/lib/traderlab/tradeLog";
import type { StrategyProject } from "@/lib/traderlab/types";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "demo-seed", { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { error } = await readJsonLimited<Record<string, unknown>>(request, 20_000);
  if (error) return error;

  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const accessCheck = await requireActiveAccess(session.email, session.accessToken);
  if (accessCheck.error) return accessCheck.error;

  const now = new Date().toISOString();
  const projects: StrategyProject[] = [];
  const existing = await listProjects(session.email, session.accessToken);

  for (const demo of DEMO_STRATEGIES) {
    const prior = existing.find((project) => project.name === demo.name);
    const parsed = parseTradeCsv(demo.csv);
    const analysis = analyzeStrategy(demo.text, {
      trades: parsed.trades,
      dataWarnings: parsed.warnings,
    });
    const project: StrategyProject = {
      id: prior?.id || randomUUID(),
      email: session.email,
      name: demo.name,
      text: demo.text,
      status: analysis.readiness === "ready" ? "Ready for paper validation" : "Needs fixes",
      score: analysis.score,
      plan: demo.plan,
      analysis,
      createdAt: prior?.createdAt || now,
      updatedAt: now,
    };
    projects.push(await saveProject(project, session.accessToken));
  }

  return NextResponse.json({
    seeded: projects.length,
    email: session.email,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      score: project.score,
      dataMode: project.analysis.dataMode,
    })),
  });
}
