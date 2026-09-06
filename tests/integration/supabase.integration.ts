import { beforeAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "@/lib/supabase/database.types";
import {
  inspectImage,
  prepareAssets,
  releaseAssets,
} from "@/modules/admin/media";
import { adminProductSchema, newProduct } from "@/modules/admin/schema";
import { homepageSchema } from "@/modules/content/schema";
const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  key: string;
  serviceKey: string;
  admin: { id: string; email: string; password: string };
  ordinary: { id: string; email: string; password: string };
};
if (new URL(env.url).hostname !== "127.0.0.1")
  throw new Error("Integration tests require local Supabase.");
let admin: SupabaseClient<Database>,
  ordinary: SupabaseClient<Database>,
  anonymous: SupabaseClient<Database>;
beforeAll(async () => {
  admin = createClient<Database>(env.url, env.key, {
    auth: { persistSession: false },
  });
  ordinary = createClient<Database>(env.url, env.key, {
    auth: { persistSession: false },
  });
  anonymous = createClient<Database>(env.url, env.key, {
    auth: { persistSession: false },
  });
  for (const [client, credentials] of [
    [admin, env.admin],
    [ordinary, env.ordinary],
  ] as const) {
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error) throw error;
  }
});
it("enforces Auth, refresh, signup restrictions and revocation with a live session", async () => {
  const settings = await fetch(env.url + "/auth/v1/settings", {
    headers: { apikey: env.key },
  });
  expect(settings.ok).toBe(true);
  expect(await settings.json()).toMatchObject({
    external: { email: true },
    disable_signup: true,
  });
  expect((await admin.rpc("is_admin")).data).toBe(true);
  expect((await ordinary.rpc("is_admin")).data).toBe(false);
  expect(
    (
      await anonymous.auth.signUp({
        email: "intruder@example.test",
        password: "UnwantedSignup123!",
      })
    ).error,
  ).not.toBeNull();
  expect((await admin.auth.refreshSession()).error).toBeNull();
  execFileSync(
    "node_modules/.bin/supabase",
    [
      "db",
      "query",
      "--local",
      `delete from private.admin_users where user_id='${env.admin.id}'`,
    ],
    { stdio: "pipe" },
  );
  try {
    expect((await admin.rpc("is_admin")).data).toBe(false);
    expect(
      (
        await admin.rpc("admin_save_product", {
          document: { id: crypto.randomUUID() },
        })
      ).error?.code,
    ).toBe("42501");
  } finally {
    execFileSync(
      "node_modules/.bin/supabase",
      [
        "db",
        "query",
        "--local",
        `insert into private.admin_users(user_id) values('${env.admin.id}')`,
      ],
      { stdio: "pipe" },
    );
  }
});
it("denies ordinary and anonymous catalogue mutations, private assets, upload URLs and role assignment", async () => {
  for (const client of [ordinary, anonymous]) {
    expect((await client.from("media_assets").select()).data ?? []).toEqual([]);
    expect(
      (
        await client.rpc("admin_save_product", {
          document: { id: crypto.randomUUID() },
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await client.storage
          .from("catalogue-drafts")
          .createSignedUploadUrl(crypto.randomUUID() + "/attack.png")
      ).error,
    ).not.toBeNull();
  }
  expect(
    (
      await ordinary
        .from("products")
        .update({ title: "Injected" })
        .eq("slug", "infinity-knot")
        .select()
    ).data,
  ).toEqual([]);
});
it("verifies actual image bytes and rejects SVG, corrupt data and oversized uploads", async () => {
  for (const bytes of [
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    Buffer.from("Not a JPEG"),
    Buffer.alloc(10485761),
  ])
    await expect(inspectImage(bytes)).rejects.toThrow();
  for (const format of ["jpeg", "png", "webp", "avif"] as const) {
    const bytes = await sharp({
      create: { width: 10, height: 20, channels: 3, background: "red" },
    })
      .toFormat(format)
      .toBuffer();
    expect(await inspectImage(bytes)).toMatchObject({
      width: 10,
      height: 20,
      mime_type: "image/" + format,
    });
  }
});
it("uploads privately, publishes copies before committing and compensates failed publication", async () => {
  const id = crypto.randomUUID(),
    path = id + "/original.png",
    bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
  const inserted = await admin.from("media_assets").insert({
    id,
    original_name: "test.png",
    private_path: path,
    status: "uploading",
    mime_type: "image/png",
  });
  expect(inserted.error).toBeNull();
  const signed = await admin.storage
    .from("catalogue-drafts")
    .createSignedUploadUrl(path, { upsert: false });
  expect(signed.error).toBeNull();
  expect(
    (
      await admin.storage
        .from("catalogue-drafts")
        .uploadToSignedUrl(path, signed.data!.token, bytes, {
          contentType: "image/png",
        })
    ).error,
  ).toBeNull();
  const publicOriginal = await fetch(
    env.url + "/storage/v1/object/public/catalogue-drafts/" + path,
  );
  expect(publicOriginal.ok).toBe(false);
  const preview = await admin.storage
    .from("catalogue-drafts")
    .createSignedUrl(path, 60);
  expect((await fetch(preview.data!.signedUrl)).ok).toBe(true);
  expect(
    (await ordinary.storage.from("catalogue-drafts").download(path)).error,
  ).not.toBeNull();
  await admin
    .from("media_assets")
    .update({ ...(await inspectImage(bytes)), status: "ready" })
    .eq("id", id);
  const token = crypto.randomUUID();
  const assets = await prepareAssets(admin, [id], true, token),
    asset = assets.get(id)!;
  expect(
    (
      await fetch(
        env.url + "/storage/v1/object/public/catalogue/" + asset.public_path,
      )
    ).ok,
  ).toBe(true);
  await releaseAssets(admin, [id], false, token);
  expect(
    (
      await admin
        .from("media_assets")
        .select("status,public_ready")
        .eq("id", id)
        .single()
    ).data,
  ).toEqual({ status: "ready", public_ready: false });
  const retry = await prepareAssets(admin, [id], true, token);
  const p = adminProductSchema.parse({
    ...newProduct(),
    title: "Integration image",
    slug: "integration-" + id,
    sku: "INT-" + id,
    status: "active",
    images: [
      {
        id: crypto.randomUUID(),
        asset_id: id,
        path: retry.get(id)!.public_path!,
        alt: "Blue test",
        width: 20,
        height: 20,
        sort_order: 0,
        is_primary: true,
        variant_id: null,
      },
    ],
  });
  const saved = await admin.rpc("admin_save_product", {
    document: JSON.parse(JSON.stringify(p)),
  });
  expect(saved.error).toBeNull();
  await releaseAssets(admin, [id], true, token);
  expect(
    (await admin.rpc("admin_claim_media_cleanup", { asset: id })).data,
  ).toBe(false);
  expect(
    (await anonymous.from("products").select("id").eq("id", p.id)).data,
  ).toHaveLength(1);
});

it("publishes managed homepage imagery through the real RPC", async () => {
  const { data: asset } = await admin
    .from("media_assets")
    .select()
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!asset) throw new Error("Prepare an image first");
  const { data: row, error: readError } = await admin
    .from("homepage_content")
    .select()
    .single();
  expect(readError).toBeNull();
  const token = crypto.randomUUID();
  const assets = await prepareAssets(admin, [asset.id], true, token);
  const c = homepageSchema.parse({
    ...row,
    hero_asset_id: asset.id,
    hero_image: assets.get(asset.id)!.public_path,
    product_ids: [],
    collection_ids: [],
  });
  const { error } = await admin.rpc("admin_save_homepage", {
    document: c,
    expected_updated_at: c.updated_at,
    product_ids: c.product_ids,
    collection_ids: c.collection_ids,
  });
  await releaseAssets(admin, [asset.id], !error, token);
  expect(error).toBeNull();
});
