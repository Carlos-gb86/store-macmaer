import { describe, expect, it } from "vitest";
import {
  createReport,
  deterministicUuid,
  mapInventory,
  parseMinorAmount,
  prepareProduct,
  prepareReview,
} from "../scripts/import-woocommerce";
import { productSchema } from "@/modules/catalog/schema";
import { canonicalizeSelections } from "@/modules/cart/selections";
import { formatOptions } from "@/modules/cart/format-options";

const context = {
  currency: "SEK" as const,
  decimals: 2,
  weightUnit: "kg",
  dimensionUnit: "cm",
};

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 412,
    name: "Custom <em>Knot</em>",
    slug: "custom-knot",
    permalink: "https://macmaer.com/product/custom-knot/",
    status: "publish",
    sku: "MAC-KNOT",
    price: "500.00",
    regular_price: "600.00",
    sale_price: "500.00",
    description: "<p>Handmade &amp; beautiful.</p>",
    short_description: "<p>Made for you.</p>",
    weight: "1.25",
    dimensions: { length: "40", width: "30", height: "10" },
    categories: [{ id: 7, name: "Cushions", slug: "cushions" }],
    tags: [{ id: 8, name: "Handmade", slug: "handmade" }],
    images: [
      {
        id: 91,
        src: "https://macmaer.com/wp-content/uploads/knot.jpg",
        alt: "Knot cushion",
      },
    ],
    attributes: [
      {
        id: 3,
        name: "Colour",
        slug: "pa_colour",
        position: 0,
        variation: true,
        options: ["Sand", "Blue"],
      },
      {
        id: 4,
        name: "Material",
        variation: false,
        options: ["Cotton"],
      },
    ],
    meta_data: [
      {
        key: "_product_addons",
        value: [
          {
            name: "Gift wrap",
            type: "multiple_choice",
            required: false,
            options: [{ label: "Yes", price: "50.00", price_type: "flat_fee" }],
          },
        ],
      },
      { key: "_unknown_plugin_field", value: { enabled: true } },
    ],
    ...overrides,
  };
}

const variations = [
  {
    id: 901,
    status: "publish",
    sku: "MAC-KNOT-SAND",
    price: "500.00",
    regular_price: "600.00",
    sale_price: "500.00",
    weight: "1.3",
    attributes: [{ id: 3, name: "Colour", option: "Sand" }],
    image: {
      id: 92,
      src: "https://macmaer.com/wp-content/uploads/knot-sand.jpg",
      alt: "Sand knot cushion",
    },
  },
];

describe("WooCommerce import mapping", () => {
  it("converts money without floating point arithmetic", () => {
    expect(parseMinorAmount("500.00", 2)).toBe(50_000);
    expect(parseMinorAmount("0.05", 2)).toBe(5);
    expect(parseMinorAmount("", 2)).toBeNull();
    expect(() => parseMinorAmount("1.999", 2)).toThrow(/more than 2 decimals/);
  });

  it("keeps WooCommerce variations separate from configurable add-ons", () => {
    const report = createReport("dry-run");
    const prepared = prepareProduct(product(), variations, context, report);

    expect(prepared.product).toMatchObject({
      legacy_woocommerce_id: 412,
      slug: "custom-knot",
      title: "Custom Knot",
      status: "draft",
      base_price: 50_000,
      compare_at_price: 60_000,
      weight_grams: 1250,
      materials: "Cotton",
    });
    expect(prepared.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "colour", is_variant_axis: true }),
        expect.objectContaining({ key: "gift-wrap", is_variant_axis: false }),
      ]),
    );
    expect(prepared.variants).toHaveLength(1);
    expect(prepared.variants[0]).toMatchObject({
      legacy_woocommerce_id: 901,
      sku: "MAC-KNOT-SAND",
      price_override: 50_000,
      value_ids: [expect.any(String)],
    });
    expect(prepared.imageSources.map((image) => image.image.id)).toEqual([
      91, 92,
    ]);
    expect(prepared.imageSources[0]?.isPrimary).toBe(true);
    expect(report.unmappedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "_unknown_plugin_field" }),
      ]),
    );
  });

  it("deterministically disambiguates WooCommerce variation SKUs repeated from the parent", () => {
    const prepared = prepareProduct(
      product({ sku: "BBK_0001" }),
      [
        { ...variations[0], id: 2131, sku: "BBK_0001" },
        {
          ...variations[0],
          id: 2130,
          sku: "BBK_0001",
          attributes: [{ id: 3, name: "Colour", option: "Blue" }],
        },
      ],
      context,
      createReport("dry-run"),
    );

    expect(prepared.product.sku).toBe("BBK_0001");
    expect(prepared.variants.map((variant) => variant.sku)).toEqual([
      "BBK_0001-WC-2131",
      "BBK_0001-WC-2130",
    ]);
    expect(prepared.variants[0]?.legacy_metadata).toMatchObject({
      source_sku: "BBK_0001",
      target_sku_disambiguated: true,
    });
  });

  it("maps made-to-order and tracked stock states explicitly", () => {
    expect(
      mapInventory({
        manage_stock: false,
        stock_quantity: null,
        stock_status: "instock",
      }),
    ).toEqual({ strategy: "MADE_TO_ORDER", quantity: null });
    expect(
      mapInventory({
        manage_stock: true,
        stock_quantity: 4,
        stock_status: "instock",
      }),
    ).toEqual({ strategy: "TRACKED", quantity: 4 });
  });

  it("keeps a wildcard attribute configurable instead of pretending it is a SKU axis", () => {
    const report = createReport("dry-run");
    const prepared = prepareProduct(
      product(),
      [
        {
          ...variations[0],
          attributes: [],
        },
      ],
      context,
      report,
    );
    expect(prepared.options[0]).toMatchObject({
      key: "colour",
      is_variant_axis: false,
    });
    expect(prepared.variants).toHaveLength(1);
    expect(prepared.variants[0]?.value_ids).toEqual([]);
    expect(report.skippedRecords).toEqual([]);
  });

  it("deduplicates repeated configurable values from WooCommerce", () => {
    const source = product({
      attributes: [
        {
          id: 0,
          name: "Color",
          slug: "Color",
          position: 0,
          visible: true,
          variation: true,
          options: ["Pastel pink", "Blue", "Pastel pink", "Blue"],
        },
      ],
    });
    const prepared = prepareProduct(
      source,
      [{ ...variations[0], attributes: [] }],
      context,
      createReport("dry-run"),
    );

    expect(prepared.options[0]?.values.map((value) => value.label)).toEqual([
      "Pastel pink",
      "Blue",
    ]);
    expect(
      new Set(prepared.options[0]?.values.map((value) => value.id)).size,
    ).toBe(2);
  });

  it.each([
    {
      id: 3557,
      name: "Velour scrunchies",
      slug: "cotton-velour-hair-scrunchies",
      colours: [
        "Mustard",
        "Orange",
        "Olive green",
        "Teal",
        "Terracotta",
        "Dark gray",
        "Magenta",
        "Blue",
        "White",
        "Fog gray",
        "Pearl gray",
        "Beige",
        "Brown",
        "Dusty pink",
        "Prune",
        "Sky blue",
        "Sage green",
      ],
    },
    {
      id: 3545,
      name: "Velvet scrunchies",
      slug: "velvet-hair-scrunchies",
      colours: [
        "Cotton white",
        "Beige",
        "Camel",
        "Brown",
        "Silver grey",
        "Sky blue",
        "Pastel pink",
        "Dusty pink",
        "Mustard",
        "Dark sage",
        "Terracotta",
        "Grey",
        "Lavender",
        "Purple",
        "Royal blue",
        "Blue",
        "Teal",
        "Pistachio",
        "Emerald",
        "Gold olive",
        "Orange",
        "Magenta",
        "Dark red",
        "Black",
      ],
    },
    {
      id: 3561,
      name: "Boucle scrunchies",
      slug: "boucle-hair-scrunchies",
      colours: [
        "Dark gray",
        "Pink",
        "Beige",
        "Brown",
        "Light gray",
        "Off white",
        "Mint green",
        "Teal",
        "Porselain",
        "Lilac",
        "Terracotta",
        "Mustard",
        "Sapphire",
        "Ruby red",
        "Emerald",
        "Black",
        "Olive green",
        "Magenta",
        "Lavender",
        "Turquoise",
        "Dark khaki",
        "Burnt orange",
        "Navy blue",
        "Sky blue",
      ],
    },
  ])(
    "maps $name ($id) to exactly five repeatable colour selectors",
    ({ id, name, slug, colours }) => {
      const report = createReport("dry-run");
      const source = product({
        id,
        name,
        slug,
        sku: "",
        meta_data: [{ key: "_wcpa_product_meta", value: [4213] }],
      });
      const sourceVariation = {
        ...variations[0],
        id: id + 1,
        sku: `SCRUNCHIE-${id}`,
        attributes: [],
      };
      const first = prepareProduct(source, [sourceVariation], context, report);
      const second = prepareProduct(
        source,
        [sourceVariation],
        context,
        createReport("dry-run"),
      );

      expect(first.options).toHaveLength(1);
      expect(first.options[0]).toMatchObject({
        key: "colour",
        label: "Colour",
        display_type: "repeated_select",
        required: true,
        is_variant_axis: false,
        affects_price: false,
        min_selections: 5,
        max_selections: 5,
        repeat_count: 5,
        allow_duplicates: true,
      });
      expect(first.options[0]?.values.map((value) => value.label)).toEqual(
        colours,
      );
      expect(
        first.options[0]?.values.every((value) => value.price_delta === 0),
      ).toBe(true);
      expect(first.variants).toEqual([]);
      expect(first.product.sku).toBe(`SCRUNCHIE-${id}`);
      expect(first.specialMapping).toMatchObject({
        legacyWooCommerceId: id,
        selectorCount: 5,
        allowsDuplicateColours: true,
      });
      expect(second.options).toEqual(first.options);
      expect(
        report.unmappedFields.some(
          (field) => field.key === "_wcpa_product_meta",
        ),
      ).toBe(false);

      const catalogueProduct = productSchema.parse({
        ...first.product,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        images: [],
        options: first.options,
        variants: first.variants,
        collections: [],
        tags: [],
      });
      const colour = catalogueProduct.options[0]!.values[0]!.id;
      const configured = canonicalizeSelections(catalogueProduct, {
        colour: [colour, colour, colour, colour, colour],
      });
      expect(configured.snapshot[0]?.values).toHaveLength(5);
      expect(formatOptions(configured.snapshot)).toEqual([
        `Colour 1: ${colours[0]}`,
        `Colour 2: ${colours[0]}`,
        `Colour 3: ${colours[0]}`,
        `Colour 4: ${colours[0]}`,
        `Colour 5: ${colours[0]}`,
      ]);
    },
  );

  it("never carries reviewer email into the prepared storefront review", () => {
    const review = prepareReview({
      id: 18,
      product_id: 412,
      status: "approved",
      reviewer: " Maria ",
      reviewer_email: "private@example.com",
      review: "<p>A beautiful handmade product.</p>",
      rating: 5,
      verified: true,
      date_created_gmt: "2025-01-02T10:00:00",
    });
    expect(review).toEqual({
      sourceReference: "18",
      productLegacyId: 412,
      displayName: "Maria",
      rating: 5,
      body: "A beautiful handmade product.",
      verifiedPurchase: true,
      createdAt: "2025-01-02T10:00:00",
    });
    expect(review).not.toHaveProperty("reviewer_email");
  });

  it("generates stable destination identities", () => {
    expect(deterministicUuid("woocommerce:product:412")).toBe(
      deterministicUuid("woocommerce:product:412"),
    );
    expect(deterministicUuid("woocommerce:product:412")).not.toBe(
      deterministicUuid("woocommerce:product:413"),
    );
  });
});
