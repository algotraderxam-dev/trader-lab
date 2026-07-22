import { NextResponse } from "next/server";
import { analyzeStrategy } from "@/lib/traderlab/engine";
import { deleteProject, getProject, saveProject } from "@/lib/server/store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const project = await getProject(id);
  const body = await request.json().catch(() => null);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

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
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const deleted = await deleteProject(id, email);
  return NextResponse.json({ deleted });
}
