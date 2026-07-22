import { NextResponse } from "next/server";
import { getProject } from "@/lib/server/store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const project = await getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    report: {
      projectId: project.id,
      name: project.name,
      email: project.email,
      score: project.score,
      status: project.status,
      generatedAt: new Date().toISOString(),
      analysis: project.analysis,
    },
  });
}
