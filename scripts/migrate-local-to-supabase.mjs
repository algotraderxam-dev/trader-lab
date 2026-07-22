import { readFile } from "node:fs/promises";
import path from "node:path";

await loadDotEnv(".env.local");

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const dbPath = path.join(process.cwd(), "data", "traderlab.json");
const db = JSON.parse(await readFile(dbPath, "utf8"));

await upsert("customers", (db.customers || []).map(toCustomerRow), "email");
await insert("checkouts", (db.checkouts || []).map(toCheckoutRow));
await upsert("projects", (db.projects || []).map(toProjectRow), "id");

console.log(
  JSON.stringify(
    {
      migrated: {
        customers: db.customers?.length || 0,
        checkouts: db.checkouts?.length || 0,
        projects: db.projects?.length || 0,
      },
    },
    null,
    2,
  ),
);

async function upsert(table, rows, conflictColumn) {
  if (!rows.length) return;
  await request(`/${table}?on_conflict=${conflictColumn}`, {
    method: "POST",
    body: JSON.stringify(rows),
    headers: { Prefer: "resolution=merge-duplicates" },
  });
}

async function insert(table, rows) {
  if (!rows.length) return;
  await request(`/${table}`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

async function request(pathname, init) {
  const response = await fetch(`${supabaseUrl}/rest/v1${pathname}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${pathname} failed with ${response.status}: ${await response.text()}`);
  }
}

function toCheckoutRow(record) {
  return {
    id: record.id,
    email: record.email,
    plan: record.plan,
    status: record.status,
    amount: record.amount,
    created_at: record.createdAt,
  };
}

function toCustomerRow(customer) {
  return {
    email: customer.email,
    plan: customer.plan,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
  };
}

function toProjectRow(project) {
  return {
    id: project.id,
    email: project.email,
    name: project.name,
    text: project.text,
    status: project.status,
    score: project.score,
    plan: project.plan,
    analysis: project.analysis,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

async function loadDotEnv(file) {
  try {
    const raw = await readFile(path.join(process.cwd(), file), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // The script can still run when env vars are provided by the shell or host.
  }
}
