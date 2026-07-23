import { NextResponse } from "next/server";
import { getSessionEmail, isAuthConfigured } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/security";

export async function GET(request: Request) {
  const limited = rateLimit(request, "auth:session", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const email = await getSessionEmail();
  return NextResponse.json({
    configured: isAuthConfigured(),
    user: email ? { email } : null,
  });
}
