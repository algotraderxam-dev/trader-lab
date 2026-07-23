import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createAuthServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase Auth is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot set cookies. Route handlers can.
        }
      },
    },
  });
}

export async function getSessionEmail() {
  if (!isAuthConfigured()) return null;

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user?.email?.trim().toLowerCase() || null;
}
