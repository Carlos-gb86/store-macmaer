"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "./auth";
import type { MutationResult } from "./result";
export async function login(
  _previous: MutationResult | null,
  form: FormData,
): Promise<MutationResult> {
  const input = z
    .object({ email: z.email(), password: z.string().min(1).max(200) })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      ok: false,
      code: "validation",
      message: "Enter your email and password.",
    };
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error)
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign-in failed. Check your credentials or try again shortly.",
    };
  const { data: allowed } = await client.rpc("is_admin");
  if (!allowed) {
    await client.auth.signOut();
    return {
      ok: false,
      code: "forbidden",
      message: "This account does not have shop administrator access.",
    };
  }
  redirect("/admin");
}
export async function logout() {
  const client = await createServerSupabaseClient();
  // Logout must also work after an administrator's membership is revoked.
  await client.auth.signOut();
  redirect("/admin/login");
}
export async function checkAdminAccess(): Promise<MutationResult> {
  try {
    await requireAdmin();
    return { ok: true, data: {}, message: "Administrator access verified." };
  } catch {
    return {
      ok: false,
      code: "forbidden",
      message: "Administrator access required.",
    };
  }
}
