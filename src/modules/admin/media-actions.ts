"use server";
import { z } from "zod";
import { requireAdmin } from "./auth";
import { mutationError } from "./errors";
import { imageFormats, inspectImage, cleanupPublicCopies } from "./media";
import type { MutationResult } from "./result";
export async function beginUpload(
  input: unknown,
): Promise<MutationResult<{ id: string; path: string; token: string }>> {
  try {
    const { client } = await requireAdmin();
    const file = z
      .object({
        name: z.string().min(1).max(200),
        size: z.number().int().min(1).max(10485760),
        type: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
      })
      .parse(input);
    const id = crypto.randomUUID(),
      path =
        id +
        "/original." +
        Object.entries(imageFormats).find(([, mime]) => mime === file.type)![0];
    const { error } = await client.from("media_assets").insert({
      id,
      original_name: file.name,
      private_path: path,
      byte_size: file.size,
      mime_type: file.type,
      upload_expires_at: new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ).toISOString(),
    });
    if (error) throw error;
    const { data, error: uploadError } = await client.storage
      .from("catalogue-drafts")
      .createSignedUploadUrl(path, { upsert: false });
    if (uploadError) throw uploadError;
    return {
      ok: true,
      data: { id, path, token: data.token },
      message: "Upload authorized.",
    };
  } catch (error) {
    return mutationError(error, "begin_upload");
  }
}
export async function finishUpload(id: string): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    z.uuid().parse(id);
    const { data: asset, error } = await client
      .from("media_assets")
      .select()
      .eq("id", id)
      .eq("status", "uploading")
      .single();
    if (error) throw error;
    const { data: file, error: downloadError } = await client.storage
      .from("catalogue-drafts")
      .download(asset.private_path);
    if (downloadError) throw downloadError;
    try {
      const metadata = await inspectImage(
        Buffer.from(await file.arrayBuffer()),
      );
      if (metadata.mime_type !== asset.mime_type)
        throw new Error("Format mismatch");
      const { error: updateError } = await client
        .from("media_assets")
        .update({ ...metadata, status: "ready" })
        .eq("id", id)
        .eq("status", "uploading");
      if (updateError) throw updateError;
    } catch {
      await client
        .from("media_assets")
        .update({ status: "invalid", cleanup_pending: true })
        .eq("id", id);
      return {
        ok: false,
        code: "validation",
        message:
          "Upload rejected. Use a valid, still JPEG, PNG, WebP, or AVIF image up to 10 MiB and 40 megapixels.",
      };
    }
    return { ok: true, data: { id }, message: "Image verified and ready." };
  } catch (error) {
    return mutationError(error, "finish_upload");
  }
}
export async function removeMedia(id: string): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    z.uuid().parse(id);
    const { data: claimed, error } = await client.rpc(
      "admin_claim_media_cleanup",
      { asset: id },
    );
    if (error) throw error;
    if (!claimed)
      return {
        ok: false,
        code: "validation",
        message:
          "This image is referenced or has an active upload/save lease. Remove all references first; new uploads can be deleted after their two-hour upload URL expires.",
      };
    const { data: asset, error: readError } = await client
      .from("media_assets")
      .select()
      .eq("id", id)
      .single();
    if (readError) throw readError;
    for (const [bucket, path] of [
      ["catalogue-drafts", asset.private_path],
      ["catalogue", asset.public_path],
    ]) {
      if (path) {
        const { error: deleteError } = await client.storage
          .from(bucket!)
          .remove([path]);
        if (deleteError) throw deleteError;
      }
    }
    const { error: deleteError } = await client
      .from("media_assets")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
    return { ok: true, data: { id }, message: "Unreferenced image deleted." };
  } catch (error) {
    return mutationError(error, "remove_media");
  }
}
export async function retryMediaCleanup(): Promise<MutationResult> {
  try {
    const { client } = await requireAdmin();
    const { data, error } = await client
      .from("media_assets")
      .select("id")
      .eq("cleanup_pending", true);
    if (error) throw error;
    await cleanupPublicCopies(
      client,
      data.map((a) => a.id),
    );
    return {
      ok: true,
      data: {},
      message:
        "Eligible public copies retried. Referenced images and active leases are retained.",
    };
  } catch (error) {
    return mutationError(error, "retry_media_cleanup");
  }
}
