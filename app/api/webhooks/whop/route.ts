import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/security";
import { recordCheckout, upsertCustomer } from "@/lib/server/store";
import {
  checkoutFromWhopEvent,
  parseWhopEvent,
  verifyWhopWebhookSignature,
} from "@/lib/server/whop";

export async function POST(request: Request) {
  const limited = rateLimit(request, "webhooks:whop", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.text();
  const verified = verifyWhopWebhookSignature(body, request.headers);
  if (!verified.ok) {
    logWhopWebhook("rejected", { reason: verified.reason });
    return NextResponse.json({ error: verified.reason }, { status: 401 });
  }

  let event: ReturnType<typeof parseWhopEvent>;
  try {
    event = parseWhopEvent(body);
  } catch {
    logWhopWebhook("rejected", { reason: "invalid_json" });
    return NextResponse.json({ error: "Invalid Whop webhook JSON." }, { status: 400 });
  }

  const checkout = checkoutFromWhopEvent(event);
  if (!checkout) {
    logWhopWebhook("ignored", { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true, ignored: event.type || "unknown" });
  }

  await upsertCustomer(checkout.email, checkout.plan);
  await recordCheckout(checkout);
  logWhopWebhook("accepted", { eventId: event.id, eventType: event.type, plan: checkout.plan });

  return NextResponse.json({
    received: true,
    access: {
      email: checkout.email,
      plan: checkout.plan,
      source: "whop",
    },
  });
}

function logWhopWebhook(
  status: "accepted" | "ignored" | "rejected",
  detail: { eventId?: string; eventType?: string; plan?: string; reason?: string },
) {
  console.info("whop.webhook", {
    status,
    eventId: detail.eventId || "unknown",
    eventType: detail.eventType || "unknown",
    plan: detail.plan || "unknown",
    reason: detail.reason || "none",
  });
}
