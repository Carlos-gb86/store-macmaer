"use server";
import { refresh } from "next/cache";
import { requireAdmin } from "@/modules/admin/auth";
import { mutationError } from "@/modules/admin/errors";
import type { Json } from "@/lib/supabase/database.types";
import { taxAdminSchema } from "./admin-schema";

export async function saveTaxSettingsAction(input: unknown) {
  try {
    const document = taxAdminSchema.parse(input);
    const { client } = await requireAdmin();
    const { error } = await client.rpc("admin_save_tax_settings", {
      document: document as unknown as Json,
    });
    if (error) throw error;
    refresh();
    return { ok: true as const, data: {}, message: "Tax settings saved." };
  } catch (error) {
    return mutationError(error, "save_tax_settings");
  }
}
