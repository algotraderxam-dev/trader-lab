import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { Plan } from "@/lib/traderlab/types";

type PaidPlan = Exclude<Plan, "demo">;

type WhopEvent = {
  id?: string;
  timestamp?: string;
  type?: string;
  data?: Record<string, unknown>;
};

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

export function whopWebhookSecret() {
  return process.env.WHOP_WEBHOOK_SECRET || process.env.QUANTPILOT_ACCESS_WEBHOOK_SECRET || "";
}

export function verifyWhopWebhookSignature(body: string, headers: Headers, secret = whopWebhookSecret()) {
  if (!secret) return { ok: false, reason: "WHOP_WEBHOOK_SECRET is not configured." };

  const id = headers.get("webhook-id") || "";
  const timestamp = headers.get("webhook-timestamp") || "";
  const signatureHeader = headers.get("webhook-signature") || "";

  if (!id || !timestamp || !signatureHeader) {
    return { ok: false, reason: "Missing Whop webhook signature headers." };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: "Invalid Whop webhook timestamp." };
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 5 * 60) {
    return { ok: false, reason: "Whop webhook timestamp is outside the allowed window." };
  }

  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", whopSignatureKey(secret)).update(signedContent).digest("base64");
  const signatures = signatureHeader
    .split(" ")
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter((part) => part && part !== "v1");

  const matched = signatures.some((signature) => safeEqual(signature, expected));
  return matched ? { ok: true as const } : { ok: false, reason: "Invalid Whop webhook signature." };
}

export function parseWhopEvent(body: string): WhopEvent {
  const event = JSON.parse(body);
  return event && typeof event === "object" ? event : {};
}

export function checkoutFromWhopEvent(event: WhopEvent) {
  if (event.type !== "payment.succeeded" && event.type !== "membership.activated") return null;

  const data = asRecord(event.data);
  const email = stringAt(data, ["user", "email"]) || stringAt(data, ["member", "email"]) || "";
  const plan = planFromWhopData(data);
  if (!email || !plan) return null;

  const amount = amountFromWhopData(data, plan);
  const idSource = stringAt(data, ["id"]) || event.id || `${email}:${plan}:${event.timestamp || Date.now()}`;

  return {
    id: stableUuid(idSource),
    email: email.trim().toLowerCase(),
    plan,
    amount,
    status: "captured" as const,
    createdAt: stringAt(data, ["paid_at"]) || stringAt(data, ["created_at"]) || event.timestamp || new Date().toISOString(),
  };
}

export function whopWebhookSetupUrl() {
  const appUrl = process.env.QUANTPILOT_APP_URL || "http://localhost:3001";
  return `${appUrl.replace(/\/$/, "")}/api/webhooks/whop`;
}

function planFromWhopData(data: Record<string, unknown>): PaidPlan | null {
  const candidates = [
    stringAt(data, ["metadata", "plan"]),
    stringAt(data, ["metadata", "quantpilot_plan"]),
    stringAt(data, ["plan", "metadata", "plan"]),
    stringAt(data, ["plan", "metadata", "quantpilot_plan"]),
  ];
  const direct = candidates.find((value): value is PaidPlan => value === "research" || value === "pro");
  if (direct) return direct;

  const productId = stringAt(data, ["product", "id"]);
  if (productId && productId === WHOP_PRODUCT_IDS.research) return "research";
  if (productId && productId === WHOP_PRODUCT_IDS.pro) return "pro";

  const total = Number(data.usd_total ?? data.total ?? data.subtotal);
  if (Number.isFinite(total)) {
    if (Math.round(total) === PRICE_BY_PLAN.pro) return "pro";
    if (Math.round(total) === PRICE_BY_PLAN.research) return "research";
  }

  return null;
}

function amountFromWhopData(data: Record<string, unknown>, plan: PaidPlan) {
  const total = Number(data.usd_total ?? data.total ?? data.subtotal);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : PRICE_BY_PLAN[plan];
}

function whopSignatureKey(secret: string) {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length > 0 && decoded.toString("base64").replace(/=+$/, "") === raw.replace(/=+$/, "")) {
      return decoded;
    }
  } catch {
    // Fall back to raw secret bytes below.
  }
  return Buffer.from(secret);
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function stableUuid(value: string) {
  const hash = createHash("sha256").update(value).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function stringAt(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
