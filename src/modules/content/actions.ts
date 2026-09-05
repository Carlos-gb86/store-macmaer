"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/modules/admin/auth";
import { mutationError } from "@/modules/admin/errors";
import { prepareAssets, releaseAssets } from "@/modules/admin/media";
import type { MutationResult } from "@/modules/admin/result";
import { homepageSchema } from "./schema";
export async function saveHomepage(input: unknown): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    const token = crypto.randomUUID();
    const c = homepageSchema.parse(input),
      ids = [c.hero_asset_id, c.story_asset_id].filter(
        (id): id is string => !!id,
      );
    try {
      const assets = await prepareAssets(client, ids, true, token);
      if (c.hero_asset_id)
        c.hero_image = assets.get(c.hero_asset_id)!.public_path!;
      if (c.story_asset_id)
        c.story_image = assets.get(c.story_asset_id)!.public_path!;
      const { data, error } = await client.rpc("admin_save_homepage", {
        document: c,
        product_ids: c.product_ids,
        collection_ids: c.collection_ids,
        expected_updated_at: c.updated_at,
      });
      if (error) throw error;
      await releaseAssets(client, ids, true, token);
      updateTag("content");
      return {
        ok: true,
        data: z.object({ updated_at: z.string() }).parse(data),
        message: "Homepage published.",
      };
    } catch (error) {
      await releaseAssets(client, ids, false, token);
      throw error;
    }
  } catch (error) {
    return mutationError(error, "save_homepage");
  }
}
