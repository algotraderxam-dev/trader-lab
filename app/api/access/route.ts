import { NextResponse } from "next/server";
import { getAccessForEmail } from "@/lib/server/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  return NextResponse.json({
    access: await getAccessForEmail(email),
  });
}

