import { NextResponse } from "next/server";
import { getStoreBackend } from "@/lib/server/store";
import { whopWebhookSetupUrl } from "@/lib/server/whop";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "QuantPilot",
    version: "mvp",
    backend: getStoreBackend(),
    whopWebhookConfigured: Boolean(process.env.WHOP_WEBHOOK_SECRET || process.env.QUANTPILOT_ACCESS_WEBHOOK_SECRET),
    whopWebhookUrl: whopWebhookSetupUrl(),
    time: new Date().toISOString(),
  });
}
