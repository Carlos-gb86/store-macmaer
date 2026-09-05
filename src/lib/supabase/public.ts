import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env/public";
import type { Database } from "./database.types";
// Stateless anonymous reads. No service key or user session enters public catalogue caching.
export function createPublicSupabaseClient() {
  const { url, key } = getSupabasePublicEnv();
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
