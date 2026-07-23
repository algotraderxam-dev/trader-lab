import { NextResponse } from "next/server";
import { createAuthServerClient, isAuthConfigured } from "@/lib/server/auth";
import { assertSameOrigin, rateLimit } from "@/lib/server/security";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "auth:logout", { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  if (isAuthConfigured()) {
    const supabase = await createAuthServerClient();
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}
