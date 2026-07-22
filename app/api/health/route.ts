import { NextResponse } from "next/server";
import { getStoreBackend } from "@/lib/server/store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "QuantPilot",
    version: "mvp",
    backend: getStoreBackend(),
    time: new Date().toISOString(),
  });
}
