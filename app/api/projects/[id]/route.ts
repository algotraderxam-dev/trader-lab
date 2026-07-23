import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  rateLimit,
  readJsonLimited,
  requireActiveAccess,
} from "@/lib/server/security";
import { getVerifiedSession } from "@/lib/server/auth";
import { analyzeStrategy } from "@/lib/traderlab/engine";
import { deleteProject, getProject, saveProject } from "@/lib/server/store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request, "projects:id:get", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const project = await getProject(id, session.accessToken);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (session.email !== project.email) {
    return NextResponse.json({ error: "Project access denied." }, { status: 403 });
  }

  const accessCheck = await requireActiveAccess(session.email, session.accessToken);
  if (accessCheck.error) return accessCheck.error;

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: Context) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "projects:id:patch", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const project = await getProject(id, session.accessToken);
  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 350_000);
  if (error) return error;

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (session.email !== project.email) {
    return NextResponse.json({ error: "Project access denied." }, { status: 403 });
  }

  const accessCheck = await requireActiveAccess(session.email, session.accessToken);
  if (accessCheck.error) return accessCheck.error;

  const text = typeof body?.text === "string" && body.text.trim() ? body.text.trim() : project.text;
  const analysis = analyzeStrategy(text);
  const updated = {
    ...project,
    name: typeof body?.name === "string" && body.name.trim() ? body.name.trim() : project.name,
    text,
    analysis,
    score: analysis.score,
    status: analysis.readiness === "ready" ? "Ready for paper validation" : "Needs fixes",
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ project: await saveProject(updated, session.accessToken) });
}

export async function DELETE(request: Request, context: Context) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "projects:id:delete", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const accessCheck = await requireActiveAccess(session.email, session.accessToken);
  if (accessCheck.error) return accessCheck.error;

  const deleted = await deleteProject(id, session.email, session.accessToken);
  return NextResponse.json({ deleted });
}
