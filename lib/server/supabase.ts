import type { CheckoutRecord, Plan, StrategyProject } from "@/lib/traderlab/types";

type CustomerRow = {
  email: string;
  plan: Plan;
  created_at: string;
  updated_at: string;
};

type CheckoutRow = {
  id: string;
  email: string;
  plan: Plan;
  status: "captured" | "test_mode";
  amount: number;
  created_at: string;
};

type ProjectRow = {
  id: string;
  email: string;
  name: string;
  text: string;
  status: string;
  score: number;
  plan: Plan;
  analysis: StrategyProject["analysis"];
  created_at: string;
  updated_at: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function storeBackend() {
  return isSupabaseConfigured() ? "supabase" : "local_json";
}

export async function supabaseUpsertCustomer(email: string, plan: Plan) {
  const [row] = await supabaseRequest<CustomerRow[]>(
    `/customers?on_conflict=email`,
    {
      method: "POST",
      body: JSON.stringify([{ email, plan }]),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    },
  );
  return fromCustomerRow(row);
}

export async function supabaseGetCustomer(email: string) {
  const [row] = await supabaseRequest<CustomerRow[]>(
    `/customers?email=eq.${encodeURIComponent(email)}&select=*`,
  );
  return row ? fromCustomerRow(row) : null;
}

export async function supabaseGetLatestCheckout(email: string) {
  const [row] = await supabaseRequest<CheckoutRow[]>(
    `/checkouts?email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc&limit=1`,
  );
  return row ? fromCheckoutRow(row) : null;
}

export async function supabaseRecordCheckout(record: CheckoutRecord) {
  const [row] = await supabaseRequest<CheckoutRow[]>(
    `/checkouts?on_conflict=id`,
    {
      method: "POST",
      body: JSON.stringify([toCheckoutRow(record)]),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    },
  );
  return fromCheckoutRow(row);
}

export async function supabaseListProjects(email: string) {
  const rows = await supabaseRequest<ProjectRow[]>(
    `/projects?email=eq.${encodeURIComponent(email)}&select=*&order=updated_at.desc`,
  );
  return rows.map(fromProjectRow);
}

export async function supabaseGetProject(id: string) {
  const [row] = await supabaseRequest<ProjectRow[]>(
    `/projects?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  return row ? fromProjectRow(row) : null;
}

export async function supabaseSaveProject(project: StrategyProject) {
  const [row] = await supabaseRequest<ProjectRow[]>(
    `/projects?on_conflict=id`,
    {
      method: "POST",
      body: JSON.stringify([toProjectRow(project)]),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    },
  );
  return fromProjectRow(row);
}

export async function supabaseDeleteProject(id: string, email: string) {
  const rows = await supabaseRequest<ProjectRow[]>(
    `/projects?id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    },
  );
  return rows.length > 0;
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  if (response.status === 204) return [] as T;
  return response.json() as Promise<T>;
}

function fromCustomerRow(row: CustomerRow) {
  return {
    email: row.email,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromCheckoutRow(row: CheckoutRow): CheckoutRecord {
  return {
    id: row.id,
    email: row.email,
    plan: row.plan,
    status: row.status,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

function toCheckoutRow(record: CheckoutRecord): CheckoutRow {
  return {
    id: record.id,
    email: record.email,
    plan: record.plan,
    status: record.status,
    amount: record.amount,
    created_at: record.createdAt,
  };
}

function fromProjectRow(row: ProjectRow): StrategyProject {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    text: row.text,
    status: row.status,
    score: row.score,
    plan: row.plan,
    analysis: row.analysis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProjectRow(project: StrategyProject): ProjectRow {
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
