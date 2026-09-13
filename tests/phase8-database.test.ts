import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createTestDatabase } from "../scripts/database.mjs";

let db: PGlite;

async function asRole<T>(
  role: "service_role" | "anon",
  action: () => Promise<T>,
) {
  await db.exec(`begin; set local role ${role}`);
  try {
    const result = await action();
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
}, 30_000);

afterAll(async () => db?.close());

describe("Phase 8 atomic public submission boundaries", () => {
  it("records five contact messages and rejects the next one atomically", async () => {
    const document = {
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      subject: "Product question",
      message: "Could you tell me more about this handmade product?",
      sender_hash: "a".repeat(64),
    };
    await asRole("service_role", async () => {
      for (let index = 0; index < 5; index++)
        await db.query("select public.submit_contact_message($1::jsonb)", [
          JSON.stringify(document),
        ]);
    });
    await expect(
      asRole("service_role", () =>
        db.query("select public.submit_contact_message($1::jsonb)", [
          JSON.stringify(document),
        ]),
      ),
    ).rejects.toThrow(/too many messages/i);
    expect(
      (
        await db.query(
          "select count(*)::integer as count from public.contact_messages",
        )
      ).rows[0],
    ).toEqual({ count: 5 });
  });

  it("records only pending reviews and enforces the rolling limit", async () => {
    const document = {
      product_id: "00000000-0000-4000-8000-000000000001",
      display_name: "Customer",
      email_hash: "b".repeat(64),
      rating: 5,
      title: "Lovely",
      body: "A beautifully made piece that looks wonderful in our home.",
      status: "APPROVED",
      verified_purchase: true,
    };
    await asRole("service_role", async () => {
      for (let index = 0; index < 3; index++)
        await db.query("select public.submit_product_review($1::jsonb)", [
          JSON.stringify(document),
        ]);
    });
    await expect(
      asRole("service_role", () =>
        db.query("select public.submit_product_review($1::jsonb)", [
          JSON.stringify(document),
        ]),
      ),
    ).rejects.toThrow(/too many reviews/i);
    expect(
      (
        await db.query(
          "select count(*)::integer as count, min(status) as status, bool_or(verified_purchase) as verified from public.product_reviews",
        )
      ).rows[0],
    ).toEqual({ count: 3, status: "PENDING", verified: false });
  });

  it("does not expose submission functions to anonymous database clients", async () => {
    await expect(
      asRole("anon", () =>
        db.query("select public.submit_contact_message('{}'::jsonb)"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("anon", () =>
        db.query("select public.submit_product_review('{}'::jsonb)"),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
