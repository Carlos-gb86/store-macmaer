import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../scripts/database.mjs";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
}, 30_000);

afterAll(async () => db?.close());

function document(title: string) {
  return {
    product: {
      id: "a759364f-f409-5d64-b642-487e514f2692",
      legacy_woocommerce_id: 412,
      legacy_metadata: { source_status: "publish" },
      slug: "imported-knot",
      title,
      subtitle: null,
      short_description: "Made for you.",
      description: "A handmade knot.",
      description_document: null,
      materials: "Cotton",
      care: "Spot clean",
      status: "draft",
      base_price: 50_000,
      compare_at_price: 60_000,
      currency: "SEK",
      sku: "WC-412",
      tax_category_key: "standard_goods",
      shipping_class_key: "standard",
      inventory_strategy: "MADE_TO_ORDER",
      stock_quantity: null,
      processing_time: null,
      weight_grams: 1200,
      dimensions: { length_cm: 40 },
      return_policy_class: "standard",
      featured: false,
      sort_order: 0,
      seo_title: null,
      seo_description: null,
      created_at: "2024-01-02T10:00:00Z",
    },
    options: [
      {
        id: "197994d6-fee1-58f4-951e-ee88ed246696",
        key: "colour",
        label: "Colour",
        display_type: "select",
        required: true,
        is_variant_axis: true,
        affects_price: false,
        affects_weight: false,
        min_selections: 1,
        max_selections: 1,
        repeat_count: 1,
        allow_duplicates: false,
        validation_rules: {},
        sort_order: 0,
        values: [
          {
            id: "681e4a9b-2b85-5c29-8868-b2c62124fd21",
            key: "sand",
            label: "Sand",
            colour_hex: null,
            image_path: null,
            price_delta: 0,
            weight_delta_grams: 0,
            active: true,
            sort_order: 0,
            asset_id: null,
          },
        ],
      },
    ],
    variants: [
      {
        id: "8059b181-2b69-57f5-b6c1-d2ef89ee700b",
        sku: "WC-412-SAND",
        title: "Sand",
        price_override: 50_000,
        price_delta: null,
        compare_at_price: 60_000,
        weight_override_grams: null,
        inventory_strategy: "MADE_TO_ORDER",
        stock_quantity: null,
        active: true,
        sort_order: 0,
        legacy_woocommerce_id: 901,
        legacy_metadata: {},
        value_ids: ["681e4a9b-2b85-5c29-8868-b2c62124fd21"],
      },
    ],
    images: [],
    collection_ids: [],
    tag_ids: [],
  };
}

describe("WooCommerce database import", () => {
  it("is service-role-only and idempotently replaces the imported graph", async () => {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('anon', 'public.import_woocommerce_product(jsonb)', 'execute') as allowed",
        )
      ).rows[0]?.allowed,
    ).toBe(false);

    await db.exec("begin; set local role service_role");
    try {
      await db.query("select public.import_woocommerce_product($1::jsonb)", [
        JSON.stringify(document("Imported Knot")),
      ]);
      await db.query("select public.import_woocommerce_product($1::jsonb)", [
        JSON.stringify(document("Imported Knot — updated")),
      ]);
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }

    expect(
      (
        await db.query(
          "select title,legacy_woocommerce_id from public.products where legacy_woocommerce_id=412",
        )
      ).rows,
    ).toEqual([
      { title: "Imported Knot — updated", legacy_woocommerce_id: 412 },
    ]);
    expect(
      (
        await db.query(
          "select (select count(*)::integer from public.product_options where product_id='a759364f-f409-5d64-b642-487e514f2692') as options, (select count(*)::integer from public.product_variants where product_id='a759364f-f409-5d64-b642-487e514f2692') as variants",
        )
      ).rows[0],
    ).toEqual({ options: 1, variants: 1 });
  });
});
