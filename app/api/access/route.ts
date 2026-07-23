import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/security";
import { getAccessForEmail } from "@/lib/server/store";

export async function GET(request: Request) {
  const limited = rateLimit(request, "access:get", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  return NextResponse.json({
    access: await getAccessForEmail(session.email, session.accessToken),
  });
}
