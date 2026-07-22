import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "QuantPilot",
    version: "mvp",
    time: new Date().toISOString(),
  });
}
