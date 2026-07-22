import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  rateLimit,
  readJsonLimited,
  requireActiveAccess,
} from "@/lib/server/security";
import { analyzeStrategy } from "@/lib/traderlab/engine";
import { deleteProject, getProject, saveProject } from "@/lib/server/store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request, "projects:id:get", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || "";
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (email !== project.email) {
    return NextResponse.json({ error: "Project access denied." }, { status: 403 });
  }

  const accessCheck = await requireActiveAccess(email);
  if (accessCheck.error) return accessCheck.error;

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: Context) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "projects:id:patch", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const project = await getProject(id);
  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 350_000);
  if (error) return error;

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email !== project.email) {
    return NextResponse.json({ error: "Project access denied." }, { status: 403 });
  }

  const accessCheck = await requireActiveAccess(email);
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

  return NextResponse.json({ project: await saveProject(updated) });
}

export async function DELETE(request: Request, context: Context) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "projects:id:delete", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const accessCheck = await requireActiveAccess(email);
  if (accessCheck.error) return accessCheck.error;

  const deleted = await deleteProject(id, email);
  return NextResponse.json({ deleted });
}
