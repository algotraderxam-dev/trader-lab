import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

await loadDotEnv(".env.local");

const appUrl = process.env.QUANTPILOT_APP_URL || "http://localhost:3001";
const secret = process.env.WHOP_WEBHOOK_SECRET || process.env.QUANTPILOT_ACCESS_WEBHOOK_SECRET;

if (!secret) {
  console.error("Missing WHOP_WEBHOOK_SECRET.");
  process.exit(1);
}

const id = `msg_quantpilot_${Date.now()}`;
const timestamp = Math.floor(Date.now() / 1000).toString();
const email = `whop-test-${Date.now()}@quantpilot.local`;
const body = JSON.stringify({
  api_version: "v1",
  id,
  timestamp: new Date().toISOString(),
  type: "payment.succeeded",
  data: {
    id: `pay_quantpilot_${Date.now()}`,
    paid_at: new Date().toISOString(),
    usd_total: 199,
    metadata: { quantpilot_plan: "pro" },
    user: { email },
    product: { title: "QuantPilot Pro" },
    plan: { metadata: { quantpilot_plan: "pro" } },
  },
});
const signature = createHmac("sha256", Buffer.from(secret))
  .update(`${id}.${timestamp}.${body}`)
  .digest("base64");

const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/webhooks/whop`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}`,
  },
  body,
});

const payload = await response.json();
console.log(JSON.stringify({ status: response.status, email, payload }, null, 2));

async function loadDotEnv(file) {
  try {
    const raw = await readFile(file, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // Env can be provided by the shell or host.
  }
}
