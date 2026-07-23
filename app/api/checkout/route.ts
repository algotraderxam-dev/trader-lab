import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin, rateLimit, readJsonLimited } from "@/lib/server/security";
import { recordCheckout, upsertCustomer } from "@/lib/server/store";
import { PRICE_BY_PLAN, whopCheckoutUrl } from "@/lib/server/whop";
import type { Plan } from "@/lib/traderlab/types";

type PaidPlan = Exclude<Plan, "demo">;

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = rateLimit(request, "checkout", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { body, error } = await readJsonLimited<Record<string, unknown>>(request, 20_000);
  if (error) return error;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const plan: PaidPlan | null = body?.plan === "research" || body?.plan === "pro" ? body.plan : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!plan) {
    return NextResponse.json({ error: "Plan must be research or pro." }, { status: 400 });
  }

  const whopUrl = whopCheckoutUrl(plan, email);
  if (whopUrl) {
    return NextResponse.json({
      checkout: null,
      provider: "whop",
      nextUrl: whopUrl,
      setupRequired: false,
    });
  }

  if (process.env.QUANTPILOT_ALLOW_TEST_ACCESS !== "1") {
    return NextResponse.json(
      { error: "Whop is not configured. Enable QUANTPILOT_ALLOW_TEST_ACCESS=1 for local test access only." },
      { status: 503 },
    );
  }

  await upsertCustomer(email, plan);
  const checkout = await recordCheckout({
    id: randomUUID(),
    email,
    plan,
    amount: PRICE_BY_PLAN[plan],
    status: "test_mode",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    checkout,
    provider: "local_test",
    nextUrl: `/app?module=overview&activated=1&plan=${plan}`,
    setupRequired: true,
  });
}
