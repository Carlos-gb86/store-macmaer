import { describe, expect, it } from "vitest";
import {
  planVariantCleanup,
  archiveVariant,
  verifyCleanup,
  type CleanupSnapshot,
} from "../scripts/cleanup-redundant-variants";

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
function fixture(): CleanupSnapshot {
  return {
    products: [
      {
        id: productId,
        title: "Pillow",
        sku: "PILLOW",
        legacy_woocommerce_id: 4643,
        base_price: 40000,
        compare_at_price: null,
        weight_grams: 500,
        inventory_strategy: "MADE_TO_ORDER",
        stock_quantity: null,
        status: "draft",
        legacy_metadata: { raw_dimensions: { width: "28" } },
      },
    ],
    product_variants: [
      {
        id: variantId,
        product_id: productId,
        title: "Variation 4644",
        sku: "PILLOW-WC-4644",
        legacy_woocommerce_id: 4644,
        price_override: 40000,
        price_delta: null,
        compare_at_price: null,
        weight_override_grams: null,
        inventory_strategy: "MADE_TO_ORDER",
        stock_quantity: null,
        active: true,
        legacy_metadata: {
          source_sku: "PILLOW",
          unmapped_meta_keys: [],
          raw_dimensions: { width: "28" },
        },
      },
    ],
    product_images: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        product_id: productId,
        variant_id: variantId,
        is_primary: true,
        sort_order: 0,
        path: "image.webp",
        alt_sv: "Kudde",
      },
    ],
    product_options: [],
    product_option_values: [],
    variant_option_values: [],
    cart_items: [],
    order_items: [],
    inventory_reservations: [],
  };
}

describe("redundant variant cleanup", () => {
  it("archives a redundant variation's measurements when parent dimensions are missing", () => {
    const source = fixture();
    source.products[0]!.legacy_metadata = {
      raw_dimensions: { width: "" },
      preserved: true,
    };
    source.product_variants[0]!.legacy_metadata.unmapped_meta_keys = [
      "_wc_pinterest_condition",
    ];
    const plan = planVariantCleanup(source);
    expect(plan.candidates).toHaveLength(1);
    expect(
      archiveVariant(source.products[0]!, source.product_variants[0]!),
    ).toMatchObject({
      preserved: true,
      raw_dimensions: { width: "" },
      redundant_woocommerce_variants: [source.product_variants[0]],
    });
  });
  it("identifies an empty imported duplicate and preserves every image field", () => {
    const before = fixture();
    const plan = planVariantCleanup(before);
    expect(plan.candidates).toHaveLength(1);
    expect(plan.images).toHaveLength(1);
    const after = structuredClone(before);
    after.product_variants = [];
    after.products[0]!.legacy_metadata = archiveVariant(
      before.products[0]!,
      before.product_variants[0]!,
    );
    after.product_images[0]!.variant_id = null;
    expect(() => verifyCleanup(before, after, plan)).not.toThrow();
    expect(planVariantCleanup(after).candidates).toEqual([]);
    after.product_images = [];
    expect(() => verifyCleanup(before, after, plan)).toThrow("product_images");
  });

  it("keeps real variant axes, even if only one combination is offered", () => {
    const source = fixture();
    source.product_options.push({
      id: "44444444-4444-4444-8444-444444444444",
      product_id: productId,
      is_variant_axis: true,
    });
    expect(planVariantCleanup(source).candidates).toEqual([]);
  });

  it.each(["cart_items", "order_items", "inventory_reservations"] as const)(
    "keeps variants referenced by %s",
    (table) => {
      const source = fixture();
      source[table].push({ variant_id: variantId });
      expect(planVariantCleanup(source).candidates).toEqual([]);
    },
  );

  it.each([
    { price_override: 45000 },
    { price_override: null, price_delta: 5000 },
    { compare_at_price: 60000 },
    { weight_override_grams: 700 },
    { inventory_strategy: "UNAVAILABLE" as const },
    { active: false },
    { stock_quantity: 5 },
    { title: "Blue" },
    { legacy_woocommerce_id: null },
    { legacy_metadata: { source_sku: "OTHER", unmapped_meta_keys: [] } },
    {
      legacy_metadata: {
        source_sku: "PILLOW",
        unmapped_meta_keys: ["plugin_price"],
      },
    },
    {
      legacy_metadata: {
        source_sku: "PILLOW",
        unmapped_meta_keys: [],
        raw_dimensions: { width: "50" },
      },
    },
  ])("preserves a distinct or ambiguous variant: %j", (change) => {
    const source = fixture();
    Object.assign(source.product_variants[0]!, change);
    expect(planVariantCleanup(source).candidates).toEqual([]);
  });

  it("keeps multiple no-axis variants for owner review", () => {
    const source = fixture();
    source.product_variants.push({
      ...source.product_variants[0]!,
      id: "55555555-5555-4555-8555-555555555555",
    });
    expect(planVariantCleanup(source).candidates).toEqual([]);
  });

  it("detects unintended product edits during verification", () => {
    const before = fixture();
    const after = structuredClone(before);
    after.product_variants = [];
    after.products[0]!.legacy_metadata = archiveVariant(
      before.products[0]!,
      before.product_variants[0]!,
    );
    after.product_images[0]!.variant_id = null;
    after.products[0]!.base_price = 50000;
    expect(() =>
      verifyCleanup(before, after, planVariantCleanup(before)),
    ).toThrow("products");
  });
});
