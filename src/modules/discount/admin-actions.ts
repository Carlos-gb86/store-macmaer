"use server";
import { refresh } from "next/cache";
import { requireAdmin } from "@/modules/admin/auth";
import { mutationError } from "@/modules/admin/errors";
import type { Json } from "@/lib/supabase/database.types";
import { discountsAdminSchema } from "./admin-schema";

export async function saveDiscountsAction(input: unknown) {
  try {
    const document = discountsAdminSchema.parse(input);
    const { client } = await requireAdmin();
    const { error } = await client.rpc("admin_save_discounts", {
      document: document as unknown as Json,
    });
    if (error) throw error;
    refresh();
    return { ok: true as const, data: {}, message: "Discounts saved." };
  } catch (error) {
    return mutationError(error, "save_discounts");
  }
}
