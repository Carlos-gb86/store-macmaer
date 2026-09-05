"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "./auth";
import {
  adminProductSchema,
  adminCollectionSchema,
  adminTagSchema,
} from "./schema";
import { mutationError } from "./errors";
import { prepareAssets, releaseAssets } from "./media";
import { plainText } from "@/modules/content/rich-text";
import type { Json } from "@/lib/supabase/database.types";
import type { MutationResult } from "./result";
const saved = z.object({ id: z.string().optional(), updated_at: z.string() });
export async function saveProduct(input: unknown): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    const token = crypto.randomUUID();
    const p = adminProductSchema.parse(input);
    if (p.description_document)
      p.description = plainText(p.description_document);
    const ids = [
      ...p.images.map((i) => i.asset_id),
      ...p.options.flatMap((o) => o.values.map((v) => v.asset_id)),
    ].filter((id): id is string => !!id);
    try {
      const assets = await prepareAssets(
        client,
        ids,
        p.status === "active",
        token,
      );
      p.images = p.images.map((i) => {
        const asset = i.asset_id ? assets.get(i.asset_id) : null;
        return asset
          ? {
              ...i,
              path:
                p.status === "active" ? asset.public_path! : asset.private_path,
              width: asset.width!,
              height: asset.height!,
              resolved_src: undefined,
              private: undefined,
            }
          : i;
      });
      p.options = p.options.map((o) => ({
        ...o,
        values: o.values.map((v) => {
          const a = v.asset_id ? assets.get(v.asset_id) : null;
          return a
            ? {
                ...v,
                image_path:
                  p.status === "active" ? a.public_path : a.private_path,
              }
            : v;
        }),
      }));
      const { data, error } = await client.rpc("admin_save_product", {
        document: p as unknown as Json,
        expected_updated_at: p.updated_at || undefined,
      });
      if (error) throw error;
      await releaseAssets(client, ids, true, token);
      updateTag("catalogue");
      updateTag("content");
      return {
        ok: true,
        data: saved.parse(data),
        message:
          p.status === "active"
            ? "Product published. Changes are live."
            : "Product saved.",
      };
    } catch (error) {
      await releaseAssets(client, ids, false, token);
      throw error;
    }
  } catch (error) {
    return mutationError(error, "save_product");
  }
}
export async function saveCollection(input: unknown): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    const token = crypto.randomUUID();
    const c = adminCollectionSchema.parse(input);
    if (c.description_document)
      c.description = plainText(c.description_document);
    const ids = c.asset_id ? [c.asset_id] : [];
    try {
      const assets = await prepareAssets(client, ids, c.active, token);
      if (c.asset_id) {
        const a = assets.get(c.asset_id)!;
        c.image_path = c.active ? a.public_path : a.private_path;
      }
      const { data, error } = await client.rpc("admin_save_collection", {
        document: c as unknown as Json,
        expected_updated_at: c.updated_at || undefined,
      });
      if (error) throw error;
      await releaseAssets(client, ids, true, token);
      updateTag("catalogue");
      updateTag("content");
      return {
        ok: true,
        data: saved.parse(data),
        message: "Collection saved.",
      };
    } catch (error) {
      await releaseAssets(client, ids, false, token);
      throw error;
    }
  } catch (error) {
    return mutationError(error, "save_collection");
  }
}
export async function mutateTag(
  operation: "save" | "merge" | "delete",
  input: unknown,
  target?: string,
): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    const tag = adminTagSchema.parse(input);
    z.enum(["save", "merge", "delete"]).parse(operation);
    if (target) z.uuid().parse(target);
    const { error } = await client.rpc("admin_mutate_tag", {
      operation,
      document: tag,
      expected_updated_at: tag.updated_at || undefined,
      target_id: target,
    });
    if (error) throw error;
    updateTag("catalogue");
    return { ok: true, data: { id: tag.id }, message: "Tag updated." };
  } catch (error) {
    return mutationError(error, "mutate_tag");
  }
}
