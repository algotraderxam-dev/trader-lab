import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/security";
import { getProject } from "@/lib/server/store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request, "reports:get", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    report: {
      projectId: project.id,
      name: project.name,
      score: project.score,
      status: project.status,
      generatedAt: new Date().toISOString(),
      analysis: project.analysis,
    },
  });
}
