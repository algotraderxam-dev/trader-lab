import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  isSupabaseConfigured,
  storeBackend,
  supabaseDeleteProject,
  supabaseGetCustomer,
  supabaseGetLatestCheckout,
  supabaseGetProject,
  supabaseListProjects,
  supabaseRecordCheckout,
  supabaseSaveProject,
  supabaseUpsertCustomer,
} from "@/lib/server/supabase";
import type { CheckoutRecord, CustomerAccess, Plan, StrategyProject } from "@/lib/traderlab/types";

type Customer = {
  email: string;
  plan: Plan;
  createdAt: string;
  updatedAt: string;
};

type Database = {
  customers: Customer[];
  checkouts: CheckoutRecord[];
  projects: StrategyProject[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "traderlab.json");

const EMPTY_DB: Database = {
  customers: [],
  checkouts: [],
  projects: [],
};

function assertDevJsonStoreAllowed() {
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    throw new Error("Supabase must be configured in production; JSON store is dev-only.");
  }
}

export async function readDb(): Promise<Database> {
  assertDevJsonStoreAllowed();
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DB_PATH, "utf8");
    return { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch {
    await writeDb(EMPTY_DB);
    return structuredClone(EMPTY_DB);
  }
}

export async function writeDb(db: Database) {
  assertDevJsonStoreAllowed();
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

export async function upsertCustomer(email: string, plan: Plan) {
  if (isSupabaseConfigured()) {
    return supabaseUpsertCustomer(email, plan);
  }

  const db = await readDb();
  const now = new Date().toISOString();
  const existing = db.customers.find((customer) => customer.email === email);
  if (existing) {
    existing.plan = plan;
    existing.updatedAt = now;
  } else {
    db.customers.push({ email, plan, createdAt: now, updatedAt: now });
  }
  await writeDb(db);
  return db.customers.find((customer) => customer.email === email)!;
}

export async function getCustomer(email: string) {
  if (isSupabaseConfigured()) {
    return supabaseGetCustomer(email);
  }

  const db = await readDb();
  return db.customers.find((customer) => customer.email === email) || null;
}

export async function getAccessForEmail(email: string): Promise<CustomerAccess> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();

  if (!normalized || normalized === "demo@quantpilot.local") {
    return {
      email: "demo@quantpilot.local",
      plan: "demo",
      active: true,
      source: "demo",
      updatedAt: now,
    };
  }

  const backendIsSupabase = isSupabaseConfigured();
  const db = backendIsSupabase ? null : await readDb();
  const customer = backendIsSupabase
    ? await supabaseGetCustomer(normalized)
    : db!.customers.find((item) => item.email === normalized) || null;
  const checkout = backendIsSupabase
    ? await supabaseGetLatestCheckout(normalized)
    : db!.checkouts.find((item) => item.email === normalized) || null;

  if (!customer) {
    return {
      email: normalized,
      plan: "demo",
      active: false,
      source: "none",
      updatedAt: now,
    };
  }

  const testAccessAllowed = process.env.QUANTPILOT_ALLOW_TEST_ACCESS === "1";
  const checkoutIsCaptured = checkout?.status === "captured";
  const checkoutIsAllowedTest = testAccessAllowed && checkout?.status === "test_mode";

  return {
    email: normalized,
    plan: customer.plan,
    active: Boolean(checkoutIsCaptured || checkoutIsAllowedTest),
    source: checkoutIsCaptured ? "whop" : checkoutIsAllowedTest ? "local_test" : "none",
    updatedAt: customer.updatedAt,
  };
}

export async function recordCheckout(record: CheckoutRecord) {
  if (isSupabaseConfigured()) {
    return supabaseRecordCheckout(record);
  }

  const db = await readDb();
  db.checkouts.unshift(record);
  await writeDb(db);
  return record;
}

export async function listProjects(email: string) {
  if (isSupabaseConfigured()) {
    return supabaseListProjects(email);
  }

  const db = await readDb();
  return db.projects
    .filter((project) => project.email === email)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string) {
  if (isSupabaseConfigured()) {
    return supabaseGetProject(id);
  }

  const db = await readDb();
  return db.projects.find((project) => project.id === id) || null;
}

export async function saveProject(project: StrategyProject) {
  if (isSupabaseConfigured()) {
    return supabaseSaveProject(project);
  }

  const db = await readDb();
  const index = db.projects.findIndex((existing) => existing.id === project.id);
  if (index >= 0) {
    db.projects[index] = project;
  } else {
    db.projects.unshift(project);
  }
  await writeDb(db);
  return project;
}

export async function deleteProject(id: string, email: string) {
  if (isSupabaseConfigured()) {
    return supabaseDeleteProject(id, email);
  }

  const db = await readDb();
  const before = db.projects.length;
  db.projects = db.projects.filter((project) => !(project.id === id && project.email === email));
  await writeDb(db);
  return db.projects.length !== before;
}

export function getStoreBackend() {
  return storeBackend();
}
