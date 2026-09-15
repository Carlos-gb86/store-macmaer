import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../scripts/database.mjs";
import {
  buildCleanupSql,
  cleanupSnapshotSchema,
  planVariantCleanup,
  verifyCleanup,
  type CleanupSnapshot,
} from "../scripts/cleanup-redundant-variants";

let db: PGlite;
const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  db = await createTestDatabase();
}, 30_000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(`delete from public.cart_items; delete from public.carts; delete from public.products;
    insert into public.products(id, slug, title, base_price, sku, legacy_woocommerce_id)
    values ('${productId}', 'pillow', 'Pillow', 40000, 'PILLOW', 4643);
    insert into public.product_variants(id, product_id, sku, title, price_override, active, legacy_woocommerce_id, legacy_metadata)
    values ('${variantId}', '${productId}', 'PILLOW-WC-4644', 'Variation 4644', 40000, true, 4644, '{"source_sku":"PILLOW","unmapped_meta_keys":[]}');
    insert into public.product_images(id, product_id, variant_id, path, alt, alt_sv, width, height, is_primary)
    values ('33333333-3333-4333-8333-333333333333', '${productId}', '${variantId}', 'image.webp', 'Pillow', 'Kudde', 1000, 1000, true);`);
});

async function snapshot(): Promise<CleanupSnapshot> {
  const source: Record<string, unknown[]> = {};
  for (const table of [
    "products",
    "product_variants",
    "product_options",
    "product_option_values",
    "variant_option_values",
    "product_images",
    "cart_items",
    "order_items",
    "inventory_reservations",
  ] as const) {
    // Match REST timestamp formatting rather than JS Date objects from the driver.
    const { rows } = await db.query<{ row: unknown }>(
      `select to_jsonb(t) as row from public.${table} t`,
    );
    source[table] = rows.map(({ row }) => row);
  }
  return cleanupSnapshotSchema.parse(source);
}

describe("transactional variant cleanup SQL", () => {
  it("detaches gallery links before deletion, preserving primary status and translated alt", async () => {
    const before = await snapshot();
    const plan = planVariantCleanup(before);
    await db.exec(buildCleanupSql(plan));
    const after = await snapshot();
    expect(after.product_variants).toEqual([]);
    expect(after.product_images[0]).toMatchObject({
      variant_id: null,
      is_primary: true,
      alt_sv: "Kudde",
      path: "image.webp",
    });
    expect(() => verifyCleanup(before, after, plan)).not.toThrow();
    expect(planVariantCleanup(after).candidates).toEqual([]);
  });

  it("aborts without detaching images if the source product changed after preview", async () => {
    const plan = planVariantCleanup(await snapshot());
    await db.exec("update public.products set base_price = 45000");
    await expect(db.exec(buildCleanupSql(plan))).rejects.toThrow(
      "changed / referenced",
    );
    await db.exec("rollback");
    expect((await snapshot()).product_images[0]!.variant_id).toBe(variantId);
    expect((await snapshot()).product_variants).toHaveLength(1);
  });

  it("aborts if a variant axis is added after preview", async () => {
    const plan = planVariantCleanup(await snapshot());
    await db.exec(
      `insert into public.product_options(product_id, key, label, display_type, is_variant_axis) values ('${productId}', 'size', 'Size', 'select', true)`,
    );
    await expect(db.exec(buildCleanupSql(plan))).rejects.toThrow(
      "changed / referenced",
    );
    await db.exec("rollback");
    expect((await snapshot()).product_variants).toHaveLength(1);
  });

  it("aborts if the gallery changed after backup", async () => {
    const plan = planVariantCleanup(await snapshot());
    await db.exec("update public.product_images set alt_sv = 'Egen bildtext'");
    await expect(db.exec(buildCleanupSql(plan))).rejects.toThrow(
      "Gallery changed",
    );
    await db.exec("rollback");
    expect((await snapshot()).product_images[0]!.variant_id).toBe(variantId);
  });

  it("preserves order/cart links added after preview without a cascading deletion", async () => {
    const plan = planVariantCleanup(await snapshot());
    await db.exec(`insert into public.carts(token_hash) values (repeat('a', 64));
      insert into public.cart_items(cart_id, product_id, variant_id, line_key, product_title, product_slug,
        quantity, base_unit_amount, display_unit_amount, display_currency)
      select id, '${productId}', '${variantId}', repeat('b',64), 'Pillow', 'pillow', 1, 40000, 40000, 'SEK' from public.carts;`);
    await expect(db.exec(buildCleanupSql(plan))).rejects.toThrow(
      "changed / referenced",
    );
    await db.exec("rollback");
    expect((await snapshot()).product_variants).toHaveLength(1);
    expect((await snapshot()).cart_items[0]!.variant_id).toBe(variantId);
  });
});
