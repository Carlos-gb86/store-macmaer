"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "./auth";
import type { MutationResult } from "./result";
function signInError(error: AuthError): MutationResult {
  // Never log credentials, tokens, or the provider's raw error message.
  console.error(
    JSON.stringify({
      event: "admin_sign_in_failed",
      code: error.code ?? "unknown",
      status: error.status,
      name: error.name,
    }),
  );
  if (error.code === "invalid_credentials")
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign-in failed. Check your email and password.",
    };
  if (error.status === 429)
    return {
      ok: false,
      code: "unauthorized",
      message: "Too many sign-in attempts. Wait a few minutes and try again.",
    };
  return {
    ok: false,
    code: "unexpected",
    message:
      "Sign-in is currently unavailable. Please try again shortly or contact the shop owner.",
  };
}
export async function login(
  _previous: MutationResult | null,
  form: FormData,
): Promise<MutationResult> {
  const input = z
    .object({
      email: z.string().trim().pipe(z.email()),
      password: z.string().min(1).max(200),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      ok: false,
      code: "validation",
      message: "Enter your email and password.",
    };
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error) return signInError(error);
  const { data: allowed, error: roleError } = await client.rpc("is_admin");
  if (roleError) {
    console.error(
      JSON.stringify({
        event: "admin_access_check_failed",
        code: roleError.code,
      }),
    );
    await client.auth.signOut();
    return {
      ok: false,
      code: "unexpected",
      message: "Administrator access could not be verified. Please try again.",
    };
  }
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
