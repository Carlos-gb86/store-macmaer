import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env/public";
import type { Database } from "./database.types";
// Phase 2 must add session-refresh proxy and server authorization before protected routes.
export async function createServerSupabaseClient() {
  const { url, key } = getSupabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies; Phase 2 refresh proxy owns this. */
        }
      },
    },
  });
}
