import { NextResponse } from "next/server";
import { getAccessForEmail } from "@/lib/server/store";

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

export function rateLimit(
  request: Request,
  scope: string,
  options: { limit?: number; windowMs?: number } = {},
) {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) },
    },
  );
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Missing request origin." }, { status: 403 });
  }

  const host = request.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
}

export async function readJsonLimited<T = unknown>(request: Request, maxBytes = 250_000) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    return { body: null as T | null, error: bodyTooLarge() };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { body: null as T | null, error: bodyTooLarge() };
  }

  try {
    return { body: (raw ? JSON.parse(raw) : null) as T | null, error: null };
  } catch {
    return {
      body: null as T | null,
      error: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

export async function requireActiveAccess(email: string, accessToken?: string) {
  const access = await getAccessForEmail(email, accessToken);
  if (access.active) return { access, error: null };

  return {
    access,
    error: NextResponse.json(
      { error: "Active QuantPilot access is required for this action." },
      { status: 403 },
    ),
  };
}

function bodyTooLarge() {
  return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}
