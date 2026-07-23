import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/security";
import { getAccessForEmail } from "@/lib/server/store";

export async function GET(request: Request) {
  const limited = rateLimit(request, "access:get", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  return NextResponse.json({
    access: await getAccessForEmail(email),
  });
}
