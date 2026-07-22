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
    return NextResponse.json({ error: verified.reason }, { status: 401 });
  }

  let event: ReturnType<typeof parseWhopEvent>;
  try {
    event = parseWhopEvent(body);
  } catch {
    return NextResponse.json({ error: "Invalid Whop webhook JSON." }, { status: 400 });
  }

  const checkout = checkoutFromWhopEvent(event);
  if (!checkout) {
    return NextResponse.json({ received: true, ignored: event.type || "unknown" });
  }

  await upsertCustomer(checkout.email, checkout.plan);
  await recordCheckout(checkout);

  return NextResponse.json({
    received: true,
    access: {
      email: checkout.email,
      plan: checkout.plan,
      source: "whop",
    },
  });
}
