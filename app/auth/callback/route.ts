import { NextResponse } from "next/server";
import { createAuthServerClient, isAuthConfigured } from "@/lib/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL(`/login?error=auth_not_configured`, url.origin));
  }

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("magic_link_failed")}`, url.origin),
      );
    }
  } else {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("missing_auth_code")}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/app";
  return next;
}
