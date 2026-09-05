import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AccessError } from "./result";
export async function requireAdmin() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new AccessError("unauthorized");
  const { data: allowed, error: roleError } = await client.rpc("is_admin");
  if (roleError || !allowed) throw new AccessError("forbidden");
  return { client, user };
}
export async function requireAdminPage() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError)
      redirect(
        error.code === "unauthorized" ? "/admin/login" : "/admin/denied",
      );
    throw error;
  }
}
