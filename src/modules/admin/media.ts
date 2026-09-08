import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveImage } from "@/modules/media/resolve-image";
type Client = SupabaseClient<Database>;
export const imageFormats = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const;
export async function inspectImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new Error("Image exceeds 10 MiB.");
  const decoder = sharp(bytes, {
    limitInputPixels: 40000000,
    animated: false,
    failOn: "warning",
  });
  const metadata = await decoder.metadata();
  const format =
    metadata.format === "heif" && metadata.compression === "av1"
      ? "avif"
      : metadata.format;
  if (
    !format ||
    !(format in imageFormats) ||
    !metadata.width ||
    !metadata.height ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Unsupported image.");
  // Force a full decode; metadata inspection alone accepts truncated/corrupt payloads.
  await decoder.raw().toBuffer();
  return {
    mime_type: imageFormats[format as keyof typeof imageFormats],
    width: metadata.width,
    height: metadata.height,
    byte_size: bytes.length,
  };
}
export async function optimiseImage(bytes: Buffer, expectedMime: string) {
  const input = await inspectImage(bytes);
  if (input.mime_type !== expectedMime) throw new Error("Format mismatch");
  // Bound both landscape and portrait originals; never enlarge small images.
  // Sharp strips EXIF/GPS metadata by default and retains transparency in WebP.
  const { data, info } = await sharp(bytes, {
    limitInputPixels: 40000000,
    failOn: "warning",
  })
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  if (data.length > 10485760) throw new Error("Optimised image exceeds 10 MiB");
  return {
    bytes: data,
    metadata: {
      mime_type: "image/webp",
      width: info.width,
      height: info.height,
      byte_size: data.length,
    },
  };
}
export async function prepareAssets(
  client: Client,
  ids: (string | null | undefined)[],
  publishing: boolean,
  token: string,
) {
  const assets = new Map<
    string,
    Database["public"]["Tables"]["media_assets"]["Row"]
  >();
  for (const id of new Set(ids.filter((id): id is string => !!id))) {
    const { error: leaseError } = await client.rpc(
      "admin_acquire_media_lease",
      { asset: id, token },
    );
    if (leaseError) throw leaseError;
    const { data: asset, error } = await client
      .from("media_assets")
      .select()
      .eq("id", id)
      .eq("status", "ready")
      .eq("lease_token", token)
      .single();
    if (error || !asset) throw error ?? new Error("Image unavailable");
    if (publishing && !asset.public_ready) {
      const { data: file, error: downloadError } = await client.storage
        .from("catalogue-drafts")
        .download(asset.private_path);
      if (downloadError) throw downloadError;
      const bytes = Buffer.from(await file.arrayBuffer());
      await inspectImage(bytes);
      const path =
        asset.id +
        "/image." +
        Object.entries(imageFormats).find(
          ([, mime]) => mime === asset.mime_type,
        )![0];
      const { error: registerError } = await client
        .from("media_assets")
        .update({ public_path: path, cleanup_pending: true })
        .eq("id", id)
        .eq("lease_token", token);
      if (registerError) throw registerError;
      const { error: uploadError } = await client.storage
        .from("catalogue")
        .upload(path, bytes, { contentType: asset.mime_type!, upsert: true });
      if (uploadError) throw uploadError;
      const { error: markError } = await client
        .from("media_assets")
        .update({
          public_path: path,
          public_ready: true,
          cleanup_pending: true,
        })
        .eq("id", id);
      if (markError) throw markError;
      asset.public_path = path;
      asset.public_ready = true;
    }
    assets.set(id, asset);
  }
  return assets;
}
export async function releaseAssets(
  client: Client,
  ids: string[],
  saved: boolean,
  token: string,
) {
  if (!ids.length) return;
  const { error } = await client
    .from("media_assets")
    .update({
      lease_until: null,
      lease_token: null,
      ...(saved ? { cleanup_pending: false } : { cleanup_pending: true }),
    })
    .in("id", ids)
    .eq("lease_token", token);
  if (error)
    console.error(
      JSON.stringify({ event: "media_release_failed", code: error.code }),
    );
  if (!saved) await cleanupPublicCopies(client, ids);
}
export async function cleanupPublicCopies(client: Client, ids: string[]) {
  for (const id of ids) {
    const { data: claimed, error } = await client.rpc(
      "admin_claim_public_cleanup",
      { asset: id },
    );
    if (error || !claimed) continue;
    const { data: a } = await client
      .from("media_assets")
      .select("public_path")
      .eq("id", id)
      .single();
    if (!a?.public_path) continue;
    const { error: removeError } = await client.storage
      .from("catalogue")
      .remove([a.public_path]);
    await client
      .from("media_assets")
      .update(
        removeError
          ? { status: "ready", cleanup_pending: true }
          : {
              status: "ready",
              public_ready: false,
              public_path: null,
              cleanup_pending: false,
            },
      )
      .eq("id", id);
    if (removeError)
      console.error(
        JSON.stringify({
          event: "public_copy_cleanup_failed",
          asset_id: id,
          code: removeError.name,
        }),
      );
  }
}
export async function mediaLibrary(client: Client) {
  const { data, error } = await client
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return Promise.all(
    data.map(async (asset) => {
      const { data: signed } = await client.storage
        .from("catalogue-drafts")
        .createSignedUrl(asset.private_path, 300);
      return { ...asset, preview_url: signed?.signedUrl ?? null };
    }),
  );
}
export type MediaItem = Awaited<ReturnType<typeof mediaLibrary>>[number];
export async function imagePreviews(
  client: Client,
  images: { id: string; path: string | null; asset_id: string | null }[],
) {
  const ids = [
    ...new Set(images.flatMap((i) => (i.asset_id ? [i.asset_id] : []))),
  ];
  const { data, error } = ids.length
    ? await client
        .from("media_assets")
        .select("id,private_path")
        .in("id", ids)
        .eq("status", "ready")
    : { data: [], error: null };
  if (error) throw error;
  const signed = new Map(
    await Promise.all(
      data.map(async (asset) => {
        const { data } = await client.storage
          .from("catalogue-drafts")
          .createSignedUrl(asset.private_path, 300);
        return [asset.id, data?.signedUrl ?? null] as const;
      }),
    ),
  );
  return new Map(
    images.map((i) => [
      i.id,
      i.asset_id
        ? (signed.get(i.asset_id) ?? null)
        : i.path
          ? resolveImage(i.path)
          : null,
    ]),
  );
}
