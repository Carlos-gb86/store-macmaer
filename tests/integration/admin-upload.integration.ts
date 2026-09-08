import { beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "@/lib/supabase/database.types";
vi.mock("@/modules/admin/auth", () => ({ requireAdmin: vi.fn() }));
import { requireAdmin } from "@/modules/admin/auth";
import { beginUpload, finishUpload } from "@/modules/admin/media-actions";
const env = JSON.parse(readFileSync(".env.integration.json", "utf8")) as {
  url: string;
  key: string;
  admin: { email: string; password: string };
};
if (new URL(env.url).hostname !== "127.0.0.1")
  throw new Error("Local Supabase only");
const client = createClient<Database>(env.url, env.key, {
  auth: { persistSession: false },
});
beforeAll(async () => {
  const { data, error } = await client.auth.signInWithPassword(env.admin);
  if (error || !data.user) throw new Error("Local admin login failed");
  vi.mocked(requireAdmin).mockResolvedValue({ client, user: data.user });
});
it("finalises a real signed upload as a private, correctly registered WebP", async () => {
  const bytes = await sharp({
    create: { width: 3200, height: 1600, channels: 3, background: "blue" },
  })
    .jpeg()
    .toBuffer();
  const signed = await beginUpload({
    name: "large-source.jpg",
    size: bytes.length,
    type: "image/jpeg",
  });
  expect(signed.ok).toBe(true);
  if (!signed.ok) throw new Error(signed.message);
  expect(
    (
      await client.storage
        .from("catalogue-drafts")
        .uploadToSignedUrl(signed.data.path, signed.data.token, bytes, {
          contentType: "image/jpeg",
        })
    ).error,
  ).toBeNull();
  const finished = await finishUpload(signed.data.id);
  expect(finished.ok).toBe(true);
  if (!finished.ok) throw new Error(finished.message);
  expect(finished.data).toMatchObject({
    status: "ready",
    mime_type: "image/webp",
    width: 2400,
    height: 1200,
    public_ready: false,
  });
  const preview = await fetch(finished.data.preview_url!);
  expect(preview.headers.get("content-type")).toContain("image/webp");
  expect(
    (await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).format,
  ).toBe("webp");
  expect(
    (
      await fetch(
        env.url +
          "/storage/v1/object/public/catalogue-drafts/" +
          signed.data.path,
      )
    ).ok,
  ).toBe(false);
});
