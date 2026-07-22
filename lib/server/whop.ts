import type { Plan } from "@/lib/traderlab/types";

type PaidPlan = Exclude<Plan, "demo">;

export const PRICE_BY_PLAN: Record<PaidPlan, number> = {
  research: 79,
  pro: 199,
};

const WHOP_PRODUCT_IDS: Record<PaidPlan, string | undefined> = {
  research: process.env.WHOP_RESEARCH_PRODUCT_ID,
  pro: process.env.WHOP_PRO_PRODUCT_ID,
};

export function whopCheckoutUrl(plan: PaidPlan, email: string) {
  const productId = WHOP_PRODUCT_IDS[plan];
  const baseUrl = process.env.WHOP_CHECKOUT_BASE_URL || "https://whop.com/checkout";

  if (!productId) return null;

  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${productId}`);
  url.searchParams.set("email", email);
  url.searchParams.set("plan", plan);
  url.searchParams.set("source", "quantpilot");
  return url.toString();
}

export function whopIsConfigured(plan: PaidPlan) {
  return Boolean(WHOP_PRODUCT_IDS[plan]);
}
