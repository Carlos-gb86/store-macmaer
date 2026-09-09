"use server";
import { refresh } from "next/cache";
import { requireAdmin } from "@/modules/admin/auth";
import { mutationError } from "@/modules/admin/errors";
import type { Json } from "@/lib/supabase/database.types";
import { shippingAdminSchema } from "./admin-schema";

export async function saveShippingSettingsAction(input: unknown) {
  try {
    const document = shippingAdminSchema.parse(input);
    const { client } = await requireAdmin();
    const { error } = await client.rpc("admin_save_shipping_settings", {
      document: document as unknown as Json,
    });
    if (error) throw error;
    refresh();
    return { ok: true as const, data: {}, message: "Shipping settings saved." };
  } catch (error) {
    return mutationError(error, "save_shipping_settings");
  }
}
