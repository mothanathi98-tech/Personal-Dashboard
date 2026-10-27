import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Privileged client. Server-only; requires SUPABASE_SECRET_KEY (never exposed to the browser). Returns null when not configured. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
