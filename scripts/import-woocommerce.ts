#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";
import type { Database, Json } from "../src/lib/supabase/database.types";

const positiveId = z.number().int().positive();
const textValue = z.string().default("");
const wooMetaSchema = z.object({
  id: z.number().int().optional(),
  key: z.string(),
  value: z.unknown(),
});
const wooImageSchema = z.object({
  id: z.number().int().nonnegative().default(0),
  src: z.url(),
  name: z.string().optional().default(""),
  alt: z.string().optional().default(""),
});
const wooTermSchema = z.object({
  id: positiveId,
  name: z.string(),
  slug: z.string(),
});
const wooAttributeSchema = z.object({
  id: z.number().int().nonnegative().default(0),
  name: z.string(),
  slug: z.string().optional().default(""),
  position: z.number().int().optional().default(0),
  visible: z.boolean().optional().default(true),
  variation: z.boolean().optional().default(false),
  options: z.array(z.string()).optional().default([]),
  option: z.string().optional().default(""),
});
const wooDimensionsSchema = z.object({
  length: textValue,
  width: textValue,
  height: textValue,
});
const wooVariationSchema = z
  .object({
    id: positiveId,
    status: z.string().default("publish"),
    sku: textValue,
    price: textValue,
    regular_price: textValue,
    sale_price: textValue,
    on_sale: z.boolean().optional().default(false),
    manage_stock: z.boolean().optional().default(false),
    stock_quantity: z.number().int().nullable().optional().default(null),
    stock_status: z.string().optional().default("instock"),
    backorders: z.string().optional().default("no"),
    weight: textValue,
    dimensions: wooDimensionsSchema.optional().default({
      length: "",
      width: "",
      height: "",
    }),
    attributes: z.array(wooAttributeSchema).optional().default([]),
    image: wooImageSchema.nullable().optional().default(null),
    menu_order: z.number().int().optional().default(0),
    date_created_gmt: z.string().nullable().optional().default(null),
    date_modified_gmt: z.string().nullable().optional().default(null),
    meta_data: z.array(wooMetaSchema).optional().default([]),
  })
  .passthrough();
const wooProductSchema = z
  .object({
    id: positiveId,
    name: z.string(),
    slug: z.string(),
    permalink: z.url().optional().or(z.literal("")),
    status: z.literal("publish"),
    type: z.string().default("simple"),
    sku: textValue,
    price: textValue,
    regular_price: textValue,
    sale_price: textValue,
    on_sale: z.boolean().optional().default(false),
    date_on_sale_from_gmt: z.string().nullable().optional().default(null),
    date_on_sale_to_gmt: z.string().nullable().optional().default(null),
    description: textValue,
    short_description: textValue,
    featured: z.boolean().optional().default(false),
    catalog_visibility: z.string().optional().default("visible"),
    tax_status: z.string().optional().default("taxable"),
    tax_class: textValue,
    manage_stock: z.boolean().optional().default(false),
    stock_quantity: z.number().int().nullable().optional().default(null),
    stock_status: z.string().optional().default("instock"),
    backorders: z.string().optional().default("no"),
    sold_individually: z.boolean().optional().default(false),
    virtual: z.boolean().optional().default(false),
    downloadable: z.boolean().optional().default(false),
    weight: textValue,
    dimensions: wooDimensionsSchema.optional().default({
      length: "",
      width: "",
      height: "",
    }),
    shipping_class: textValue,
    shipping_class_id: z.number().int().nonnegative().optional().default(0),
    purchase_note: textValue,
    menu_order: z.number().int().optional().default(0),
    date_created_gmt: z.string().nullable().optional().default(null),
    date_modified_gmt: z.string().nullable().optional().default(null),
    categories: z.array(wooTermSchema).optional().default([]),
    tags: z.array(wooTermSchema).optional().default([]),
    images: z.array(wooImageSchema).optional().default([]),
    attributes: z.array(wooAttributeSchema).optional().default([]),
    default_attributes: z.array(wooAttributeSchema).optional().default([]),
    variations: z.array(positiveId).optional().default([]),
    grouped_products: z.array(positiveId).optional().default([]),
    upsell_ids: z.array(positiveId).optional().default([]),
    cross_sell_ids: z.array(positiveId).optional().default([]),
    related_ids: z.array(positiveId).optional().default([]),
    brands: z.array(wooTermSchema).optional().default([]),
    reviews_allowed: z.boolean().optional().default(true),
    meta_data: z.array(wooMetaSchema).optional().default([]),
  })
  .passthrough();
const wooReviewSchema = z
  .object({
    id: positiveId,
    product_id: positiveId,
    status: z.literal("approved"),
    reviewer: z.string(),
    review: z.string(),
    rating: z.number().int(),
    verified: z.boolean().optional().default(false),
    date_created_gmt: z.string().nullable().optional().default(null),
    date_created: z.string().nullable().optional().default(null),
  })
  .strip();
const mediaSchema = z.object({
  id: positiveId,
  alt_text: z.string().optional().default(""),
  source_url: z.url().optional(),
});

type WooProduct = z.infer<typeof wooProductSchema>;
type WooVariation = z.infer<typeof wooVariationSchema>;
type WooReview = z.infer<typeof wooReviewSchema>;
type WooTerm = z.infer<typeof wooTermSchema>;
type WooImage = z.infer<typeof wooImageSchema>;
type WooMeta = z.infer<typeof wooMetaSchema>;
type InventoryStrategy =
  "TRACKED" | "MADE_TO_ORDER" | "UNLIMITED" | "UNAVAILABLE";

type UnmappedField = {
  scope: "product" | "variation" | "add-on";
  sourceId: string;
  key: string;
  valueSummary: string;
  reason: string;
};
type ReportRecord = {
  scope: string;
  sourceId: string;
  reason: string;
};
type ProductReport = {
  legacyWooCommerceId: number;
  slug: string;
  destinationId: string;
  destinationStatus: "draft";
  options: number;
  variants: number;
  images: number;
  result: "planned" | "imported" | "skipped" | "error";
};
type ImagePlacementAudit = {
  legacyWooCommerceId: number;
  slug: string;
  total: number;
  gallery: number;
  featured: number;
  variationOnly: number;
  additionalVariationBindings: number;
  galleryAssociatedWithVariation: number;
};
type SpecialMapping = {
  legacyWooCommerceId: number;
  slug: string;
  name: string;
  kind: "wcpa_scrunchie_pack_of_five";
  selectorCount: 5;
  colourCount: number;
  allowsDuplicateColours: true;
};
export type MigrationReport = {
  mode: "dry-run" | "apply";
  startedAt: string;
  completedAt: string | null;
  sourceOrigin: string;
  targetOrigin: string | null;
  source: {
    currency: string | null;
    decimals: number | null;
    weightUnit: string | null;
    dimensionUnit: string | null;
    publishedProducts: number;
    variations: number;
    approvedReviews: number;
    imageOccurrences: number;
  };
  imported: {
    products: number;
    variants: number;
    options: number;
    imagesDownloaded: number;
    imagesUploaded: number;
    reviews: number;
    collections: number;
    tags: number;
  };
  products: ProductReport[];
  specialMappings: SpecialMapping[];
  imageAudit: {
    definition: string;
    uniqueSources: number;
    uniqueContentFiles: number;
    totalPlacements: number;
    galleryPlacements: number;
    featuredPlacements: number;
    variationOnlyPlacements: number;
    additionalVariationBindings: number;
    galleryPlacementsAssociatedWithVariation: number;
    productPlacements: ImagePlacementAudit[];
    duplicateSourceReferences: Array<{
      sourceReference: string;
      placements: number;
      productIds: number[];
    }>;
    duplicateContentFiles: Array<{
      contentHash: string;
      sourceReferences: string[];
    }>;
    downloads: {
      attemptedUnique: number;
      succeededUnique: number;
      retriedUnique: number;
      retryAttempts: number;
      failedUnique: number;
      cacheHits: number;
    };
  };
  unmappedFields: UnmappedField[];
  unmappedSummary: Array<{
    key: string;
    frequency: number;
    classification: "commerce" | "seo" | "bookkeeping" | "other";
    needsAttention: boolean;
  }>;
  skippedRecords: ReportRecord[];
  errors: ReportRecord[];
  warnings: string[];
};

type TargetOptionValue = {
  id: string;
  key: string;
  label: string;
  colour_hex: string | null;
  image_path: string | null;
  price_delta: number;
  weight_delta_grams: number;
  active: boolean;
  sort_order: number;
  asset_id: string | null;
};
type TargetOption = {
  id: string;
  key: string;
  label: string;
  display_type:
    | "select"
    | "radio"
    | "checkbox"
    | "short_text"
    | "number"
    | "repeated_select";
  required: boolean;
  is_variant_axis: boolean;
  affects_price: boolean;
  affects_weight: boolean;
  min_selections: number;
  max_selections: number | null;
  repeat_count: number;
  allow_duplicates: boolean;
  validation_rules: Record<string, number>;
  sort_order: number;
  values: TargetOptionValue[];
};
type TargetVariant = {
  id: string;
  sku: string;
  title: string;
  price_override: number | null;
  price_delta: null;
  compare_at_price: number | null;
  weight_override_grams: number | null;
  inventory_strategy: InventoryStrategy;
  stock_quantity: number | null;
  active: boolean;
  sort_order: number;
  legacy_woocommerce_id: number;
  legacy_metadata: Record<string, unknown>;
  value_ids: string[];
};
type SourceImage = {
  occurrenceId: string;
  image: WooImage;
  productId: number;
  productTitle: string;
  variantId: string | null;
  isPrimary: boolean;
  sortOrder: number;
  kind: "gallery" | "variation-only" | "additional-variation-binding";
};
type TargetImage = {
  id: string;
  variant_id: string | null;
  path: string;
  alt: string;
  width: number;
  height: number;
  is_primary: boolean;
  sort_order: number;
  asset_id: string;
  legacy_wordpress_media_id: number | null;
};
type PreparedProduct = {
  product: Record<string, unknown> & {
    id: string;
    legacy_woocommerce_id: number;
    slug: string;
    title: string;
    status: "draft";
  };
  options: TargetOption[];
  variants: TargetVariant[];
  imageSources: SourceImage[];
  categories: WooTerm[];
  tags: WooTerm[];
  specialMapping: SpecialMapping | null;
};
type StoreContext = {
  currency: "SEK" | "EUR" | "USD";
  decimals: number;
  weightUnit: string | null;
  dimensionUnit: string | null;
};

const SCRUNCHIE_PACKS = new Map<
  number,
  { label: string; colours: readonly string[] }
>([
  [
    3557,
    {
      label: "Velour scrunchies",
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
  ],
  [
    3545,
    {
      label: "Velvet scrunchies",
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
  ],
  [
    3561,
    {
      label: "Boucle scrunchies",
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
  ],
]);

const UUID_NAMESPACE = Buffer.from(
  "a39f8d3098354f79b6c7a6f32c314c3a"
    .match(/.{2}/g)!
    .map((part) => Number.parseInt(part, 16)),
);

export function deterministicUuid(value: string) {
  const bytes = createHash("sha1")
    .update(UUID_NAMESPACE)
    .update(value)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    rsquo: "’",
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name] ?? match);
}

export function textFromHtml(value: string) {
  return decodeEntities(
    value
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|ul|ol)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slug(value: string, fallback: string, max = 100) {
  const result = textFromHtml(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max)
    .replace(/-$/g, "");
  return result || fallback;
}

function uniqueKey(base: string, used: Set<string>) {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}-${suffix++}`.slice(0, 100);
  used.add(candidate);
  return candidate;
}

function lookupKey(value: string) {
  return textFromHtml(value).normalize("NFKC").trim().toLocaleLowerCase("en");
}

export function parseMinorAmount(value: string, decimals: number) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d+(?:\.\d+)?$/.test(normalized))
    throw new Error(`Invalid WooCommerce monetary amount: ${normalized}`);
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals)
    throw new Error(`WooCommerce amount has more than ${decimals} decimals.`);
  const amount =
    BigInt(whole!) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0");
  if (amount > 2_147_483_647n)
    throw new Error("WooCommerce monetary amount exceeds the supported range.");
  return Number(amount);
}

export function mapInventory(input: {
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
}): { strategy: InventoryStrategy; quantity: number | null } {
  if (input.manage_stock)
    return {
      strategy: "TRACKED",
      quantity: Math.max(0, input.stock_quantity ?? 0),
    };
  if (input.stock_status === "outofstock")
    return { strategy: "UNAVAILABLE", quantity: null };
  return { strategy: "MADE_TO_ORDER", quantity: null };
}

function weightInGrams(value: string, unit: string | null) {
  if (!value.trim() || !unit) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const factors: Record<string, number> = {
    g: 1,
    kg: 1000,
    lbs: 453.59237,
    oz: 28.349523125,
  };
  const factor = factors[unit.toLowerCase()];
  return factor ? Math.round(amount * factor) : null;
}

function dimensionsInCentimetres(
  dimensions: WooProduct["dimensions"],
  unit: string | null,
) {
  const factors: Record<string, number> = {
    mm: 0.1,
    cm: 1,
    m: 100,
    in: 2.54,
    yd: 91.44,
  };
  const factor = unit ? factors[unit.toLowerCase()] : undefined;
  if (!factor) return {};
  const result: Record<string, number> = {};
  for (const [source, target] of [
    ["length", "length_cm"],
    ["width", "width_cm"],
    ["height", "height_cm"],
  ] as const) {
    const amount = Number(dimensions[source]);
    if (Number.isFinite(amount) && amount > 0)
      result[target] = Math.round(amount * factor * 10_000) / 10_000;
  }
  return result;
}

function summary(value: unknown) {
  if (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every((item) => ["string", "number", "boolean"].includes(typeof item))
  )
    return JSON.stringify(value).slice(0, 160);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value && typeof value === "object")
    return `object(${Object.keys(value).slice(0, 12).join(", ")})`;
  return String(value ?? "null")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .slice(0, 160);
}

function recordUnmapped(
  report: MigrationReport,
  scope: UnmappedField["scope"],
  sourceId: string,
  key: string,
  value: unknown,
  reason: string,
) {
  report.unmappedFields.push({
    scope,
    sourceId,
    key,
    valueSummary: summary(value),
    reason,
  });
}

function metaMap(metadata: WooMeta[]) {
  return new Map(metadata.map((item) => [item.key, item.value]));
}

function hasMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function seoMetadata(metadata: WooMeta[]) {
  const values = metaMap(metadata);
  const title =
    values.get("_yoast_wpseo_title") ??
    values.get("rank_math_title") ??
    values.get("_aioseo_title") ??
    null;
  const description =
    values.get("_yoast_wpseo_metadesc") ??
    values.get("rank_math_description") ??
    values.get("_aioseo_description") ??
    null;
  return {
    title: typeof title === "string" && title.trim() ? title.trim() : null,
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : null,
  };
}

function inspectMetadata(
  report: MigrationReport,
  scope: "product" | "variation",
  sourceId: string,
  metadata: WooMeta[],
) {
  const handled = new Set([
    "_product_addons",
    "product_addons",
    "_yoast_wpseo_title",
    "_yoast_wpseo_metadesc",
    "rank_math_title",
    "rank_math_description",
    "_aioseo_title",
    "_aioseo_description",
  ]);
  for (const item of metadata)
    if (
      !handled.has(item.key) &&
      hasMetadataValue(item.value) &&
      !(
        item.key === "_wcpa_product_meta" &&
        scope === "product" &&
        SCRUNCHIE_PACKS.has(Number(sourceId))
      )
    )
      recordUnmapped(
        report,
        scope,
        sourceId,
        item.key,
        item.value,
        item.key === "_wcpa_product_meta"
          ? "This references WCPA form IDs. The WooCommerce read-only key cannot read WCPA's administrator-only form-definition endpoint; recreate or separately export this form during draft review."
          : "No verified mapping exists for this WooCommerce/plugin metadata field.",
      );
}

function parseAddonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function addOnOptions(
  product: WooProduct,
  context: StoreContext,
  usedKeys: Set<string>,
  report: MigrationReport,
  startOrder: number,
) {
  const metadata = metaMap(product.meta_data);
  const raw = metadata.get("_product_addons") ?? metadata.get("product_addons");
  if (raw === undefined) return [];
  const addOns = parseAddonArray(raw);
  if (!addOns) {
    recordUnmapped(
      report,
      "add-on",
      String(product.id),
      "_product_addons",
      raw,
      "The add-on payload is not a JSON array (it may be PHP-serialized).",
    );
    return [];
  }

  const mapped: TargetOption[] = [];
  for (const [index, rawAddOn] of addOns.entries()) {
    const addOn = objectValue(rawAddOn);
    const sourceId = `${product.id}:${index}`;
    if (!addOn) {
      recordUnmapped(
        report,
        "add-on",
        sourceId,
        "payload",
        rawAddOn,
        "Invalid add-on object.",
      );
      continue;
    }
    const name = textFromHtml(
      String(addOn.name ?? addOn.title ?? `Option ${index + 1}`),
    );
    const type = String(addOn.type ?? "");
    const required = Boolean(addOn.required);
    const price = String(addOn.price ?? "");
    const priceType = String(addOn.price_type ?? "flat_fee");
    const pricedText = price && parseMinorAmount(price, context.decimals) !== 0;
    const key = uniqueKey(slug(name, `addon-${index + 1}`), usedKeys);
    const id = deterministicUuid(
      `woocommerce:product:${product.id}:addon:${index}:${key}`,
    );

    if (["custom_text", "custom_textarea"].includes(type)) {
      if (pricedText) {
        recordUnmapped(
          report,
          "add-on",
          sourceId,
          type,
          addOn,
          "Priced free-text add-ons require a conditional price model that is not available.",
        );
        continue;
      }
      const max = Number(addOn.max ?? addOn.max_characters);
      mapped.push({
        id,
        key,
        label: name,
        display_type: "short_text",
        required,
        is_variant_axis: false,
        affects_price: false,
        affects_weight: false,
        min_selections: required ? 1 : 0,
        max_selections: 1,
        repeat_count: 1,
        allow_duplicates: true,
        validation_rules:
          Number.isInteger(max) && max > 0
            ? { max_length: Math.min(max, 120) }
            : {},
        sort_order: startOrder + index,
        values: [],
      });
      continue;
    }

    if (!["multiple_choice", "checkbox"].includes(type)) {
      recordUnmapped(
        report,
        "add-on",
        sourceId,
        type || "unknown-type",
        addOn,
        "This add-on type cannot be represented without custom business logic.",
      );
      continue;
    }
    const rawOptions = Array.isArray(addOn.options) ? addOn.options : [];
    if (!rawOptions.length) {
      recordUnmapped(
        report,
        "add-on",
        sourceId,
        type,
        addOn,
        "The add-on has no choices.",
      );
      continue;
    }
    const values: TargetOptionValue[] = [];
    const usedValueKeys = new Set<string>();
    let unsupportedPrice = false;
    for (const [valueIndex, rawOption] of rawOptions.entries()) {
      const option = objectValue(rawOption);
      if (!option) {
        recordUnmapped(
          report,
          "add-on",
          sourceId,
          `${type}.options[${valueIndex}]`,
          rawOption,
          "Invalid choice object.",
        );
        continue;
      }
      const optionPriceType = String(
        option.price_type ?? priceType ?? "flat_fee",
      );
      if (!["", "flat_fee", "quantity_based"].includes(optionPriceType)) {
        unsupportedPrice = true;
        recordUnmapped(
          report,
          "add-on",
          sourceId,
          `${type}.options[${valueIndex}].price_type`,
          optionPriceType,
          "Percentage and formula-based add-on prices require manual mapping.",
        );
        continue;
      }
      const label = textFromHtml(
        String(option.label ?? option.name ?? `Choice ${valueIndex + 1}`),
      );
      const valueKey = uniqueKey(
        slug(label, `choice-${valueIndex + 1}`),
        usedValueKeys,
      );
      const delta =
        parseMinorAmount(String(option.price ?? "0"), context.decimals) ?? 0;
      if (option.image || option.image_url)
        recordUnmapped(
          report,
          "add-on",
          sourceId,
          `${type}.options[${valueIndex}].image`,
          option.image ?? option.image_url,
          "The choice is retained as text; its plugin-specific swatch image needs manual review.",
        );
      values.push({
        id: deterministicUuid(
          `woocommerce:product:${product.id}:addon:${index}:value:${valueIndex}`,
        ),
        key: valueKey,
        label,
        colour_hex: null,
        image_path: null,
        price_delta: delta,
        weight_delta_grams: 0,
        active: true,
        sort_order: valueIndex,
        asset_id: null,
      });
    }
    if (!values.length || unsupportedPrice) continue;
    const multiple = type === "checkbox";
    const display = String(addOn.display ?? "");
    mapped.push({
      id,
      key,
      label: name,
      display_type: multiple
        ? "checkbox"
        : display === "select"
          ? "select"
          : "radio",
      required,
      is_variant_axis: false,
      affects_price: values.some((value) => value.price_delta !== 0),
      affects_weight: false,
      min_selections: required ? 1 : 0,
      max_selections: multiple ? null : 1,
      repeat_count: 1,
      allow_duplicates: false,
      validation_rules: {},
      sort_order: startOrder + index,
      values,
    });
  }
  return mapped;
}

function pricePair(
  current: string,
  regular: string,
  sale: string,
  decimals: number,
) {
  const regularAmount = parseMinorAmount(regular, decimals);
  const saleAmount = parseMinorAmount(sale, decimals);
  const currentAmount =
    parseMinorAmount(current, decimals) ?? saleAmount ?? regularAmount ?? 0;
  return {
    current: currentAmount,
    regular: regularAmount,
    sale: saleAmount,
    compareAt:
      regularAmount !== null && regularAmount > currentAmount
        ? regularAmount
        : null,
  };
}

function axisOptions(
  product: WooProduct,
  variations: WooVariation[],
  usedKeys: Set<string>,
) {
  const axes = product.attributes
    .filter(
      (attribute) =>
        attribute.variation &&
        variations.length > 0 &&
        variations.every((variation) =>
          variation.attributes.some(
            (candidate) =>
              (attribute.id
                ? candidate.id === attribute.id
                : lookupKey(candidate.name) === lookupKey(attribute.name)) &&
              candidate.option.trim() !== "",
          ),
        ),
    )
    .sort((a, b) => a.position - b.position);
  return axes.map((attribute, index) => {
    const identity = attribute.id
      ? `id:${attribute.id}`
      : `name:${lookupKey(attribute.name)}`;
    const explicitVariationValues = variations.flatMap((variation) =>
      variation.attributes
        .filter((candidate) =>
          attribute.id
            ? candidate.id === attribute.id
            : lookupKey(candidate.name) === lookupKey(attribute.name),
        )
        .map((candidate) => candidate.option)
        .filter(Boolean),
    );
    const labels = [...attribute.options, ...explicitVariationValues].filter(
      (label, labelIndex, values) =>
        values.findIndex(
          (candidate) => lookupKey(candidate) === lookupKey(label),
        ) === labelIndex,
    );
    const key = uniqueKey(
      slug(
        attribute.slug.replace(/^pa[-_]/, "") || attribute.name,
        `attribute-${index + 1}`,
      ),
      usedKeys,
    );
    const optionId = deterministicUuid(
      `woocommerce:product:${product.id}:attribute:${identity}`,
    );
    const usedValueKeys = new Set<string>();
    return {
      identity,
      source: attribute,
      target: {
        id: optionId,
        key,
        label: textFromHtml(attribute.name),
        display_type: "select" as const,
        required: true,
        is_variant_axis: true,
        affects_price: false,
        affects_weight: false,
        min_selections: 1,
        max_selections: 1,
        repeat_count: 1,
        allow_duplicates: false,
        validation_rules: {},
        sort_order: index,
        values: labels.map((label, valueIndex) => ({
          id: deterministicUuid(
            `woocommerce:product:${product.id}:attribute:${identity}:value:${lookupKey(label)}`,
          ),
          key: uniqueKey(slug(label, `value-${valueIndex + 1}`), usedValueKeys),
          label: textFromHtml(label),
          colour_hex: null,
          image_path: null,
          price_delta: 0,
          weight_delta_grams: 0,
          active: true,
          sort_order: valueIndex,
          asset_id: null,
        })),
      },
    };
  });
}

function configurableAttributeOptions(
  product: WooProduct,
  axes: ReturnType<typeof axisOptions>,
  usedKeys: Set<string>,
  startOrder: number,
) {
  const axisIdentities = new Set(axes.map((axis) => axis.identity));
  return product.attributes
    .filter((attribute) => {
      if (!attribute.variation) return false;
      const identity = attribute.id
        ? `id:${attribute.id}`
        : `name:${lookupKey(attribute.name)}`;
      return !axisIdentities.has(identity);
    })
    .map((attribute, index): TargetOption => {
      const identity = attribute.id
        ? `id:${attribute.id}`
        : `name:${lookupKey(attribute.name)}`;
      const usedValueKeys = new Set<string>();
      const labels = attribute.options.filter(
        (label, labelIndex, values) =>
          values.findIndex(
            (candidate) => lookupKey(candidate) === lookupKey(label),
          ) === labelIndex,
      );
      return {
        id: deterministicUuid(
          `woocommerce:product:${product.id}:configurable-attribute:${identity}`,
        ),
        key: uniqueKey(
          slug(
            attribute.slug.replace(/^pa[-_]/, "") || attribute.name,
            `attribute-${startOrder + index + 1}`,
          ),
          usedKeys,
        ),
        label: textFromHtml(attribute.name),
        display_type: "select",
        required: true,
        is_variant_axis: false,
        affects_price: false,
        affects_weight: false,
        min_selections: 1,
        max_selections: 1,
        repeat_count: 1,
        allow_duplicates: false,
        validation_rules: {},
        sort_order: startOrder + index,
        values: labels.map((label, valueIndex) => ({
          id: deterministicUuid(
            `woocommerce:product:${product.id}:configurable-attribute:${identity}:value:${lookupKey(label)}`,
          ),
          key: uniqueKey(slug(label, `value-${valueIndex + 1}`), usedValueKeys),
          label: textFromHtml(label),
          colour_hex: null,
          image_path: null,
          price_delta: 0,
          weight_delta_grams: 0,
          active: true,
          sort_order: valueIndex,
          asset_id: null,
        })),
      };
    });
}

function scrunchiePackOption(
  product: WooProduct,
  usedKeys: Set<string>,
): { option: TargetOption; mapping: SpecialMapping } | null {
  const pack = SCRUNCHIE_PACKS.get(product.id);
  if (!pack) return null;
  const optionId = deterministicUuid(
    `woocommerce:product:${product.id}:wcpa:scrunchie-pack:colour`,
  );
  const usedValueKeys = new Set<string>();
  return {
    option: {
      id: optionId,
      key: uniqueKey("colour", usedKeys),
      label: "Colour",
      display_type: "repeated_select",
      required: true,
      is_variant_axis: false,
      affects_price: false,
      affects_weight: false,
      min_selections: 5,
      max_selections: 5,
      repeat_count: 5,
      allow_duplicates: true,
      validation_rules: {},
      sort_order: 0,
      values: pack.colours.map((label, index) => ({
        id: deterministicUuid(
          `woocommerce:product:${product.id}:wcpa:scrunchie-pack:colour:${lookupKey(label)}`,
        ),
        key: uniqueKey(slug(label, `colour-${index + 1}`), usedValueKeys),
        label,
        colour_hex: null,
        image_path: null,
        price_delta: 0,
        weight_delta_grams: 0,
        active: true,
        sort_order: index,
        asset_id: null,
      })),
    },
    mapping: {
      legacyWooCommerceId: product.id,
      slug: slug(product.slug || product.name, `wc-product-${product.id}`),
      name: pack.label,
      kind: "wcpa_scrunchie_pack_of_five",
      selectorCount: 5,
      colourCount: pack.colours.length,
      allowsDuplicateColours: true,
    },
  };
}

function mapVariations(
  product: WooProduct,
  variations: WooVariation[],
  axes: ReturnType<typeof axisOptions>,
  context: StoreContext,
  report: MigrationReport,
) {
  const mapped: TargetVariant[] = [];
  const sourceByTarget = new Map<string, WooVariation>();
  const siblingSkuCounts = new Map<string, number>();
  for (const variation of variations) {
    const sourceSku = variation.sku.trim();
    if (sourceSku)
      siblingSkuCounts.set(
        sourceSku,
        (siblingSkuCounts.get(sourceSku) ?? 0) + 1,
      );
  }
  for (const [index, variation] of variations.entries()) {
    inspectMetadata(
      report,
      "variation",
      String(variation.id),
      variation.meta_data,
    );
    const valueIds: string[] = [];
    let complete = true;
    for (const axis of axes) {
      const selected = variation.attributes.find((candidate) =>
        axis.source.id
          ? candidate.id === axis.source.id
          : lookupKey(candidate.name) === lookupKey(axis.source.name),
      );
      const value = axis.target.values.find(
        (candidate) =>
          lookupKey(candidate.label) === lookupKey(selected?.option ?? ""),
      );
      if (!selected?.option || !value) {
        complete = false;
        report.skippedRecords.push({
          scope: "variation",
          sourceId: String(variation.id),
          reason:
            "A wildcard or unknown variation attribute cannot be represented as one exact SKU combination.",
        });
        break;
      }
      valueIds.push(value.id);
    }
    if (!complete || valueIds.length !== axes.length) continue;
    const prices = pricePair(
      variation.price,
      variation.regular_price,
      variation.sale_price,
      context.decimals,
    );
    const inventory = mapInventory(variation);
    const targetId = deterministicUuid(`woocommerce:variation:${variation.id}`);
    const sourceSku = variation.sku.trim();
    const generatedSku = !sourceSku;
    const sourceSkuCollides =
      !!sourceSku &&
      (sourceSku === product.sku.trim() ||
        (siblingSkuCounts.get(sourceSku) ?? 0) > 1);
    const targetSku = generatedSku
      ? `WC-${product.id}-${variation.id}`
      : sourceSkuCollides
        ? `${sourceSku}-WC-${variation.id}`
        : sourceSku;
    const title =
      variation.attributes
        .map((attribute) => textFromHtml(attribute.option))
        .filter(Boolean)
        .join(" / ") || `Variation ${variation.id}`;
    const row: TargetVariant = {
      id: targetId,
      sku: targetSku,
      title,
      price_override: prices.current,
      price_delta: null,
      compare_at_price: prices.compareAt,
      weight_override_grams: weightInGrams(
        variation.weight,
        context.weightUnit,
      ),
      inventory_strategy: inventory.strategy,
      stock_quantity: inventory.quantity,
      active: variation.status === "publish",
      sort_order: variation.menu_order || index,
      legacy_woocommerce_id: variation.id,
      legacy_metadata: {
        source_status: variation.status,
        regular_price: variation.regular_price || null,
        sale_price: variation.sale_price || null,
        current_price: variation.price || null,
        on_sale: variation.on_sale,
        raw_weight: variation.weight || null,
        raw_dimensions: variation.dimensions,
        weight_unit: context.weightUnit,
        dimension_unit: context.dimensionUnit,
        manage_stock: variation.manage_stock,
        stock_status: variation.stock_status,
        backorders: variation.backorders,
        generated_sku: generatedSku,
        source_sku: sourceSku || null,
        target_sku_disambiguated: sourceSkuCollides,
        date_modified_gmt: variation.date_modified_gmt,
        unmapped_meta_keys: variation.meta_data
          .filter((item) => hasMetadataValue(item.value))
          .map((item) => item.key)
          .filter(
            (key) =>
              ![
                "_yoast_wpseo_title",
                "_yoast_wpseo_metadesc",
                "rank_math_title",
                "rank_math_description",
                "_aioseo_title",
                "_aioseo_description",
              ].includes(key),
          ),
      },
      value_ids: valueIds,
    };
    mapped.push(row);
    sourceByTarget.set(targetId, variation);
  }
  return { mapped, sourceByTarget };
}

function collectImages(
  product: WooProduct,
  variants: TargetVariant[],
  variationSource: Map<string, WooVariation>,
  unlinkedVariations: WooVariation[] = [],
) {
  const images: SourceImage[] = product.images.map((image, index) => ({
    occurrenceId: `gallery:${index}:${image.id || createHash("sha1").update(image.src).digest("hex")}`,
    image,
    productId: product.id,
    productTitle: textFromHtml(product.name),
    variantId: null,
    isPrimary: index === 0,
    sortOrder: index,
    kind: "gallery",
  }));
  const placementsBySource = new Map<string, SourceImage[]>();
  for (const image of images) {
    const reference = imageSourceReference(image.image);
    placementsBySource.set(reference, [
      ...(placementsBySource.get(reference) ?? []),
      image,
    ]);
  }
  for (const variant of variants) {
    const image = variationSource.get(variant.id)?.image;
    if (!image) continue;
    const reference = imageSourceReference(image);
    const existingPlacements = placementsBySource.get(reference) ?? [];
    const existing = existingPlacements.find(
      (placement) =>
        placement.kind === "gallery" && placement.variantId === null,
    );
    if (existing && existing.variantId === null) {
      existing.variantId = variant.id;
      continue;
    }
    const placement: SourceImage = {
      occurrenceId: `variation:${variant.legacy_woocommerce_id}:${image.id || createHash("sha1").update(image.src).digest("hex")}`,
      image,
      productId: product.id,
      productTitle: textFromHtml(product.name),
      variantId: variant.id,
      isPrimary: false,
      sortOrder: images.length,
      kind:
        existingPlacements.length > 0
          ? "additional-variation-binding"
          : "variation-only",
    };
    images.push(placement);
    placementsBySource.set(reference, [...existingPlacements, placement]);
  }
  for (const variation of unlinkedVariations) {
    const image = variation.image;
    if (!image) continue;
    const reference = imageSourceReference(image);
    if (placementsBySource.has(reference)) continue;
    const placement: SourceImage = {
      occurrenceId: `variation:${variation.id}:${image.id || createHash("sha1").update(image.src).digest("hex")}`,
      image,
      productId: product.id,
      productTitle: textFromHtml(product.name),
      variantId: null,
      isPrimary: false,
      sortOrder: images.length,
      kind: "variation-only",
    };
    images.push(placement);
    placementsBySource.set(reference, [placement]);
  }
  return images;
}

function imageSourceReference(image: WooImage) {
  return image.id > 0
    ? `wordpress-media:${image.id}`
    : `source-hash:${createHash("sha256").update(image.src).digest("hex")}`;
}

function finalizeImageAudit(
  report: MigrationReport,
  placements: SourceImage[],
  contentReferences: Map<string, Set<string>>,
) {
  const references = new Map<
    string,
    { placements: number; productIds: Set<number> }
  >();
  const products = new Map<number, ImagePlacementAudit>();
  for (const placement of placements) {
    const reference = imageSourceReference(placement.image);
    const existingReference = references.get(reference) ?? {
      placements: 0,
      productIds: new Set<number>(),
    };
    existingReference.placements += 1;
    existingReference.productIds.add(placement.productId);
    references.set(reference, existingReference);

    const existingProduct = products.get(placement.productId) ?? {
      legacyWooCommerceId: placement.productId,
      slug:
        report.products.find(
          (product) => product.legacyWooCommerceId === placement.productId,
        )?.slug ?? `wc-product-${placement.productId}`,
      total: 0,
      gallery: 0,
      featured: 0,
      variationOnly: 0,
      additionalVariationBindings: 0,
      galleryAssociatedWithVariation: 0,
    };
    existingProduct.total += 1;
    if (placement.kind === "gallery") existingProduct.gallery += 1;
    else if (placement.kind === "variation-only")
      existingProduct.variationOnly += 1;
    else existingProduct.additionalVariationBindings += 1;
    if (placement.isPrimary) existingProduct.featured += 1;
    if (placement.kind === "gallery" && placement.variantId)
      existingProduct.galleryAssociatedWithVariation += 1;
    products.set(placement.productId, existingProduct);
  }
  report.imageAudit.uniqueSources = references.size;
  report.imageAudit.uniqueContentFiles = contentReferences.size;
  report.imageAudit.totalPlacements = placements.length;
  report.imageAudit.galleryPlacements = placements.filter(
    (placement) => placement.kind === "gallery",
  ).length;
  report.imageAudit.featuredPlacements = placements.filter(
    (placement) => placement.isPrimary,
  ).length;
  report.imageAudit.variationOnlyPlacements = placements.filter(
    (placement) => placement.kind === "variation-only",
  ).length;
  report.imageAudit.additionalVariationBindings = placements.filter(
    (placement) => placement.kind === "additional-variation-binding",
  ).length;
  report.imageAudit.galleryPlacementsAssociatedWithVariation =
    placements.filter(
      (placement) => placement.kind === "gallery" && placement.variantId,
    ).length;
  report.imageAudit.productPlacements = [...products.values()].sort(
    (a, b) => a.legacyWooCommerceId - b.legacyWooCommerceId,
  );
  report.imageAudit.duplicateSourceReferences = [...references]
    .filter(([, value]) => value.placements > 1)
    .map(([sourceReference, value]) => ({
      sourceReference,
      placements: value.placements,
      productIds: [...value.productIds].sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        b.placements - a.placements ||
        a.sourceReference.localeCompare(b.sourceReference),
    );
  report.imageAudit.duplicateContentFiles = [...contentReferences]
    .filter(([, sourceReferences]) => sourceReferences.size > 1)
    .map(([contentHash, sourceReferences]) => ({
      contentHash,
      sourceReferences: [...sourceReferences].sort(),
    }))
    .sort(
      (a, b) =>
        b.sourceReferences.length - a.sourceReferences.length ||
        a.contentHash.localeCompare(b.contentHash),
    );
}

function finalizeUnmappedSummary(report: MigrationReport) {
  const groups = new Map<string, number>();
  for (const field of report.unmappedFields)
    groups.set(field.key, (groups.get(field.key) ?? 0) + 1);
  report.unmappedSummary = [...groups].map(([key, frequency]) => {
    const normalized = key.toLowerCase();
    const classification =
      /seo|yoast|aioseo|rank_math|canonical|open.?graph/.test(normalized)
        ? "seo"
        : /price|stock|inventory|sku|tax|shipping|weight|dimension|image|gallery|option|add.?on|wcpa|cartflows_fbt|cross.?sell|upsell/.test(
              normalized,
            )
          ? "commerce"
          : /layout|theme|sidebar|monsterinsights|analytic|migrate|content.?score|reading.?time/.test(
                normalized,
              )
            ? "bookkeeping"
            : "other";
    return {
      key,
      frequency,
      classification,
      needsAttention:
        classification === "commerce" ||
        classification === "other" ||
        (classification === "seo" &&
          /title|description|canonical|open.?graph/.test(normalized)),
    };
  });
  report.unmappedSummary.sort(
    (a, b) => b.frequency - a.frequency || a.key.localeCompare(b.key),
  );
}

export function prepareProduct(
  productInput: unknown,
  variationInputs: unknown[],
  context: StoreContext,
  report: MigrationReport,
): PreparedProduct {
  const product = wooProductSchema.parse(productInput);
  const variations = variationInputs.map((value) =>
    wooVariationSchema.parse(value),
  );
  inspectMetadata(report, "product", String(product.id), product.meta_data);
  const usedKeys = new Set<string>();
  const special = scrunchiePackOption(product, usedKeys);
  if (product.id === 3561)
    report.warnings.push(
      'WooCommerce product 3561 preserves the supplied customer-facing colour label "Porselain"; confirm whether it should later be corrected to "Porcelain".',
    );
  const axes = special ? [] : axisOptions(product, variations, usedKeys);
  const configurableAttributes = special
    ? []
    : configurableAttributeOptions(product, axes, usedKeys, axes.length);
  const { mapped: variants, sourceByTarget } = special
    ? { mapped: [], sourceByTarget: new Map<string, WooVariation>() }
    : mapVariations(product, variations, axes, context, report);
  if (special)
    for (const variation of variations)
      inspectMetadata(
        report,
        "variation",
        String(variation.id),
        variation.meta_data,
      );
  // The three verified WCPA products deliberately replace their legacy form
  // with exactly one repeated native option (rendered as Colour 1–5). Do not
  // mix inferred attributes or unrelated plug-in add-ons into that contract.
  const options = special
    ? [special.option]
    : [
        ...axes.map((axis) => axis.target),
        ...configurableAttributes,
        ...addOnOptions(
          product,
          context,
          usedKeys,
          report,
          axes.length + configurableAttributes.length,
        ),
      ];
  const prices = pricePair(
    product.price,
    product.regular_price,
    product.sale_price,
    context.decimals,
  );
  const inventory = mapInventory(product);
  const seo = seoMetadata(product.meta_data);
  const informationalAttributes = product.attributes
    .filter((attribute) => !attribute.variation)
    .map((attribute) => ({
      name: textFromHtml(attribute.name),
      values: attribute.options.map(textFromHtml),
      visible: attribute.visible,
    }));
  const material = informationalAttributes.find((attribute) =>
    /material|fabric/i.test(attribute.name),
  );
  const care = informationalAttributes.find((attribute) =>
    /care|washing|cleaning/i.test(attribute.name),
  );
  const description = textFromHtml(product.description);
  const shortDescription = textFromHtml(product.short_description);
  const permalinkPath = product.permalink
    ? new URL(product.permalink).pathname
    : `/product/${product.slug}`;
  if (!["simple", "variable"].includes(product.type))
    recordUnmapped(
      report,
      "product",
      String(product.id),
      "type",
      product.type,
      "This WooCommerce product type needs manual review; its catalogue fields are imported as a draft.",
    );
  if (product.shipping_class.trim() && product.shipping_class !== "standard")
    recordUnmapped(
      report,
      "product",
      String(product.id),
      "shipping_class",
      product.shipping_class,
      "The source class is preserved in metadata; assign a configured Macmaer shipping class during draft review.",
    );
  if (product.tax_class.trim())
    recordUnmapped(
      report,
      "product",
      String(product.id),
      "tax_class",
      product.tax_class,
      "The source class is preserved in metadata; verify the Macmaer tax category during draft review.",
    );
  const unmappedMetaKeys = product.meta_data
    .filter((item) => hasMetadataValue(item.value))
    .map((item) => item.key)
    .filter(
      (key) =>
        ![
          "_product_addons",
          "product_addons",
          "_yoast_wpseo_title",
          "_yoast_wpseo_metadesc",
          "rank_math_title",
          "rank_math_description",
          "_aioseo_title",
          "_aioseo_description",
        ].includes(key) && !(special && key === "_wcpa_product_meta"),
    );
  const productId = deterministicUuid(`woocommerce:product:${product.id}`);
  return {
    product: {
      id: productId,
      legacy_woocommerce_id: product.id,
      legacy_metadata: {
        source_status: product.status,
        source_type: product.type,
        legacy_path: permalinkPath,
        description_html: product.description,
        short_description_html: product.short_description,
        regular_price: product.regular_price || null,
        sale_price: product.sale_price || null,
        current_price: product.price || null,
        on_sale: product.on_sale,
        sale_from_gmt: product.date_on_sale_from_gmt,
        sale_to_gmt: product.date_on_sale_to_gmt,
        catalog_visibility: product.catalog_visibility,
        tax_status: product.tax_status,
        tax_class: product.tax_class || null,
        shipping_class: product.shipping_class || null,
        shipping_class_id: product.shipping_class_id || null,
        manage_stock: product.manage_stock,
        stock_status: product.stock_status,
        backorders: product.backorders,
        sold_individually: product.sold_individually,
        virtual: product.virtual,
        downloadable: product.downloadable,
        purchase_note: textFromHtml(product.purchase_note),
        raw_weight: product.weight || null,
        raw_dimensions: product.dimensions,
        weight_unit: context.weightUnit,
        dimension_unit: context.dimensionUnit,
        informational_attributes: informationalAttributes,
        configurable_variation_attributes: configurableAttributes.map(
          (option) => option.key,
        ),
        source_variations: special
          ? variations.map((variation) => ({
              legacy_woocommerce_id: variation.id,
              sku: variation.sku || null,
              regular_price: variation.regular_price || null,
              sale_price: variation.sale_price || null,
              current_price: variation.price || null,
              stock_status: variation.stock_status,
              stock_quantity: variation.stock_quantity,
              weight: variation.weight || null,
              dimensions: variation.dimensions,
            }))
          : [],
        default_attributes: product.default_attributes.map((attribute) => ({
          id: attribute.id,
          name: textFromHtml(attribute.name),
          option: textFromHtml(attribute.option),
        })),
        grouped_product_ids: product.grouped_products,
        upsell_product_ids: product.upsell_ids,
        cross_sell_product_ids: product.cross_sell_ids,
        related_product_ids: product.related_ids,
        brands: product.brands,
        reviews_allowed: product.reviews_allowed,
        date_modified_gmt: product.date_modified_gmt,
        unmapped_meta_keys: unmappedMetaKeys,
      },
      slug: slug(product.slug || product.name, `wc-product-${product.id}`),
      title: textFromHtml(product.name),
      subtitle: null,
      short_description: shortDescription,
      description,
      description_document: description
        ? {
            type: "doc",
            content: description.split(/\n\n+/).map((paragraph) => ({
              type: "paragraph",
              content: [{ type: "text", text: paragraph }],
            })),
          }
        : null,
      materials: material?.values.join(", ") ?? "",
      care: care?.values.join(", ") ?? "",
      status: "draft",
      base_price: prices.current,
      compare_at_price: prices.compareAt,
      currency: context.currency,
      sku:
        product.sku.trim() ||
        (special && variations.length === 1
          ? variations[0]?.sku.trim() || null
          : null),
      tax_category_key: "standard_goods",
      shipping_class_key: "standard",
      inventory_strategy: inventory.strategy,
      stock_quantity: inventory.quantity,
      processing_time: null,
      weight_grams: weightInGrams(product.weight, context.weightUnit),
      dimensions: dimensionsInCentimetres(
        product.dimensions,
        context.dimensionUnit,
      ),
      return_policy_class: "standard",
      featured: product.featured,
      sort_order: product.menu_order,
      seo_title: seo.title,
      seo_description: seo.description,
      created_at: product.date_created_gmt,
    },
    options,
    variants,
    imageSources: collectImages(
      product,
      variants,
      sourceByTarget,
      special ? variations : [],
    ),
    categories: product.categories,
    tags: product.tags,
    specialMapping: special?.mapping ?? null,
  };
}

export function prepareReview(input: unknown) {
  const review: WooReview = wooReviewSchema.parse(input);
  const body = textFromHtml(review.review).slice(0, 5000);
  if (body.length < 10) return null;
  return {
    sourceReference: String(review.id),
    productLegacyId: review.product_id,
    displayName: textFromHtml(review.reviewer).slice(0, 100) || "Customer",
    rating: Math.max(1, Math.min(5, review.rating)),
    body,
    verifiedPurchase: review.verified,
    createdAt: review.date_created_gmt ?? review.date_created ?? null,
  };
}

export function createReport(
  mode: MigrationReport["mode"],
  sourceOrigin = "https://example.invalid",
  targetOrigin: string | null = null,
): MigrationReport {
  return {
    mode,
    startedAt: new Date().toISOString(),
    completedAt: null,
    sourceOrigin,
    targetOrigin,
    source: {
      currency: null,
      decimals: null,
      weightUnit: null,
      dimensionUnit: null,
      publishedProducts: 0,
      variations: 0,
      approvedReviews: 0,
      imageOccurrences: 0,
    },
    imported: {
      products: 0,
      variants: 0,
      options: 0,
      imagesDownloaded: 0,
      imagesUploaded: 0,
      reviews: 0,
      collections: 0,
      tags: 0,
    },
    products: [],
    specialMappings: [],
    imageAudit: {
      definition:
        "One placement is one target product_images relationship. Each WooCommerce gallery entry is one placement. The first variation using a gallery image binds that gallery placement; each additional variation using the same image needs another binding placement. An image absent from the gallery is variation-only. The first gallery entry is featured within that same placement.",
      uniqueSources: 0,
      uniqueContentFiles: 0,
      totalPlacements: 0,
      galleryPlacements: 0,
      featuredPlacements: 0,
      variationOnlyPlacements: 0,
      additionalVariationBindings: 0,
      galleryPlacementsAssociatedWithVariation: 0,
      productPlacements: [],
      duplicateSourceReferences: [],
      duplicateContentFiles: [],
      downloads: {
        attemptedUnique: 0,
        succeededUnique: 0,
        retriedUnique: 0,
        retryAttempts: 0,
        failedUnique: 0,
        cacheHits: 0,
      },
    },
    unmappedFields: [],
    unmappedSummary: [],
    skippedRecords: [],
    errors: [],
    warnings: [],
  };
}

function wait(milliseconds: number) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

class WooCommerceReader {
  private readonly base: URL;
  private readonly rootPath: string;
  private readonly authorization: string;

  constructor(baseUrl: string, consumerKey: string, consumerSecret: string) {
    this.base = new URL(baseUrl);
    if (this.base.protocol !== "https:")
      throw new Error("WOOCOMMERCE_URL must use HTTPS.");
    this.rootPath = this.base.pathname.replace(/\/+$/, "");
    this.authorization = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
  }

  get origin() {
    return this.base.origin;
  }

  private apiUrl(path: string, query: Record<string, string | number> = {}) {
    const url = new URL(
      `${this.rootPath}/wp-json/wc/v3/${path.replace(/^\//, "")}`,
      this.base.origin,
    );
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, String(value));
    return url;
  }

  private async response(url: URL, authenticated: boolean) {
    for (let attempt = 0; attempt < 4; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: authenticated
            ? { Accept: "application/json", Authorization: this.authorization }
            : { Accept: "application/json" },
          redirect: "error",
          signal: AbortSignal.timeout(45_000),
        });
      } catch (error) {
        if (attempt < 3) {
          await wait(500 * 2 ** attempt);
          continue;
        }
        const cause =
          error instanceof Error && error.cause instanceof Error
            ? ` ${error.cause.message}`
            : "";
        throw new Error(
          `Read-only API request could not connect at ${url.pathname}.${cause}`,
        );
      }
      if (response.ok) return response;
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await wait(500 * 2 ** attempt);
        continue;
      }
      throw new Error(
        `Read-only API request failed (${response.status}) at ${url.pathname}.`,
      );
    }
    throw new Error(`Read-only API request failed at ${url.pathname}.`);
  }

  async get(path: string, query: Record<string, string | number> = {}) {
    const response = await this.response(this.apiUrl(path, query), true);
    return response.json() as Promise<unknown>;
  }

  async pages(path: string, query: Record<string, string | number> = {}) {
    const records: unknown[] = [];
    let page = 1;
    while (true) {
      const response = await this.response(
        this.apiUrl(path, { ...query, per_page: 100, page }),
        true,
      );
      const payload: unknown = await response.json();
      if (!Array.isArray(payload))
        throw new Error(
          `Expected an array from the read-only endpoint ${path}.`,
        );
      records.push(...payload);
      const pages = Number(response.headers.get("x-wp-totalpages"));
      if (
        (Number.isFinite(pages) && page >= pages) ||
        (!pages && payload.length < 100)
      )
        break;
      page += 1;
    }
    return records;
  }

  async media(id: number) {
    const url = new URL(
      `${this.rootPath}/wp-json/wp/v2/media/${id}`,
      this.base.origin,
    );
    url.searchParams.set("context", "view");
    url.searchParams.set("_fields", "id,alt_text,source_url");
    const response = await this.response(url, false);
    return mediaSchema.parse(await response.json());
  }
}

async function optionalSetting(
  woo: WooCommerceReader,
  id: "woocommerce_weight_unit" | "woocommerce_dimension_unit",
  report: MigrationReport,
) {
  try {
    const value = z
      .object({ value: z.string() })
      .parse(await woo.get(`settings/products/${id}`)).value;
    return value || null;
  } catch (error) {
    report.warnings.push(
      `${id} could not be read; normalized ${id.includes("weight") ? "weight" : "dimensions"} will remain empty. ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function storeContext(woo: WooCommerceReader, report: MigrationReport) {
  const system = z
    .object({
      settings: z.object({
        currency: z.enum(["SEK", "EUR", "USD"]),
        number_of_decimals: z.number().int().min(0).max(6),
      }),
    })
    .parse(await woo.get("system_status"));
  const [weightUnit, dimensionUnit] = await Promise.all([
    optionalSetting(woo, "woocommerce_weight_unit", report),
    optionalSetting(woo, "woocommerce_dimension_unit", report),
  ]);
  return {
    currency: system.settings.currency,
    decimals: system.settings.number_of_decimals,
    weightUnit,
    dimensionUnit,
  } satisfies StoreContext;
}

async function optimiseSourceImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > 40 * 1024 * 1024)
    throw new Error("Source image is empty or exceeds 40 MiB.");
  const decoder = sharp(bytes, {
    limitInputPixels: 40_000_000,
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
    !["jpeg", "png", "webp", "avif"].includes(format) ||
    !metadata.width ||
    !metadata.height ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Unsupported, animated, or invalid source image.");
  await decoder.clone().raw().toBuffer();
  const { data, info } = await decoder
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  if (data.length > 10 * 1024 * 1024)
    throw new Error("Optimized image exceeds the Storage limit of 10 MiB.");
  return { bytes: data, width: info.width, height: info.height };
}

function assertPublicHttpsUrl(url: URL) {
  if (url.protocol !== "https:")
    throw new Error("Source image URL must use HTTPS.");
  if (
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)
  )
    throw new Error(
      "Source image URL resolves to a disallowed private hostname.",
    );
}

async function fetchImage(url: URL) {
  assertPublicHttpsUrl(url);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(60_000),
      });
      assertPublicHttpsUrl(new URL(response.url));
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await response.body?.cancel();
        await wait(500 * 2 ** attempt);
        continue;
      }
      if (!response.ok)
        throw new Error(`Image download failed with HTTP ${response.status}.`);
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > 40 * 1024 * 1024)
        throw new Error("Source image exceeds 40 MiB.");
      return {
        bytes: Buffer.from(await response.arrayBuffer()),
        attempts: attempt + 1,
      };
    } catch (error) {
      if (attempt < 3) {
        await wait(500 * 2 ** attempt);
        continue;
      }
      const cause =
        error instanceof Error && error.cause instanceof Error
          ? ` ${error.cause.message}`
          : "";
      throw new Error(
        `Image download failed after four attempts.${cause || ` ${error instanceof Error ? error.message : String(error)}`}`,
      );
    }
  }
  throw new Error("Image download failed after four attempts.");
}

type MediaTransfer = {
  assetId: string;
  path: string;
  alt: string | null;
  width: number;
  height: number;
  mediaId: number | null;
};
type StoredImage = Omit<MediaTransfer, "alt" | "mediaId">;

async function transferMedia(
  source: SourceImage,
  woo: WooCommerceReader,
  client: SupabaseClient<Database> | null,
  report: MigrationReport,
  mediaCache: Map<
    number,
    Awaited<ReturnType<WooCommerceReader["media"]>> | null
  >,
  transferCache: Map<string, Promise<MediaTransfer>>,
  contentCache: Map<string, StoredImage>,
  contentReferences: Map<string, Set<string>>,
  imageCacheDirectory: string,
) {
  let media: Awaited<ReturnType<WooCommerceReader["media"]>> | null = null;
  if (source.image.id > 0) {
    if (!mediaCache.has(source.image.id)) {
      try {
        mediaCache.set(source.image.id, await woo.media(source.image.id));
      } catch (error) {
        mediaCache.set(source.image.id, null);
        report.warnings.push(
          `WordPress media ${source.image.id} could not be read; WooCommerce alt text and image URL will be used. ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    media = mediaCache.get(source.image.id) ?? null;
  }
  const downloadUrl = new URL(media?.source_url ?? source.image.src);
  const reference = imageSourceReference(source.image);
  const existingTransfer = transferCache.get(reference);
  if (existingTransfer) return existingTransfer;

  const transfer = (async (): Promise<MediaTransfer> => {
    report.imageAudit.downloads.attemptedUnique += 1;
    const cacheKey = createHash("sha256")
      .update(`${reference}\0${downloadUrl.href}`)
      .digest("hex");
    const cachePath = resolve(imageCacheDirectory, `${cacheKey}.source`);
    let downloaded: Awaited<ReturnType<typeof fetchImage>>;
    let cached = false;
    try {
      downloaded = { bytes: await readFile(cachePath), attempts: 0 };
      cached = true;
      report.imageAudit.downloads.cacheHits += 1;
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
      try {
        downloaded = await fetchImage(downloadUrl);
      } catch (downloadError) {
        report.imageAudit.downloads.failedUnique += 1;
        throw downloadError;
      }
    }
    if (downloaded.attempts > 1) {
      report.imageAudit.downloads.retriedUnique += 1;
      report.imageAudit.downloads.retryAttempts += downloaded.attempts - 1;
    }
    let optimized: Awaited<ReturnType<typeof optimiseSourceImage>>;
    try {
      optimized = await optimiseSourceImage(downloaded.bytes);
    } catch (error) {
      if (!cached) {
        report.imageAudit.downloads.failedUnique += 1;
        throw error;
      }
      report.warnings.push(
        `Cached source image ${source.image.id || reference} was invalid and was refreshed from WordPress.`,
      );
      try {
        downloaded = await fetchImage(downloadUrl);
        optimized = await optimiseSourceImage(downloaded.bytes);
      } catch (refreshError) {
        report.imageAudit.downloads.failedUnique += 1;
        throw refreshError;
      }
    }
    if (!cached || downloaded.attempts > 0) {
      await mkdir(imageCacheDirectory, { recursive: true });
      await writeFile(cachePath, downloaded.bytes, { mode: 0o600 });
    }
    report.imageAudit.downloads.succeededUnique += 1;
    report.imported.imagesDownloaded += 1;
    const contentHash = createHash("sha256")
      .update(optimized.bytes)
      .digest("hex");
    const sourceReferences =
      contentReferences.get(contentHash) ?? new Set<string>();
    sourceReferences.add(reference);
    contentReferences.set(contentHash, sourceReferences);
    let stored = contentCache.get(contentHash);
    if (!stored) {
      const assetId = deterministicUuid(
        `woocommerce:asset:sha256:${contentHash}`,
      );
      const path = `woocommerce/sha256/${contentHash}/image.webp`;
      let resolvedAssetId = assetId;
      if (client) {
        for (const [bucket, cacheControl] of [
          ["catalogue-drafts", "0"],
          ["catalogue", "31536000"],
        ] as const) {
          const { error } = await client.storage
            .from(bucket)
            .upload(path, optimized.bytes, {
              contentType: "image/webp",
              cacheControl,
              upsert: true,
            });
          if (error) throw error;
        }
        const { data: existing, error: lookupError } = await client
          .from("media_assets")
          .select("id")
          .eq("source", "WOOCOMMERCE")
          .eq("source_reference", `sha256:${contentHash}`)
          .maybeSingle();
        if (lookupError) throw lookupError;
        resolvedAssetId = existing?.id ?? assetId;
        const { error } = await client.from("media_assets").upsert(
          {
            id: resolvedAssetId,
            original_name:
              basename(downloadUrl.pathname) ||
              `wordpress-${source.image.id}.webp`,
            private_path: path,
            public_path: path,
            public_ready: true,
            status: "ready",
            mime_type: "image/webp",
            byte_size: optimized.bytes.length,
            width: optimized.width,
            height: optimized.height,
            cleanup_pending: false,
            created_by: null,
            source: "WOOCOMMERCE",
            source_reference: `sha256:${contentHash}`,
          },
          { onConflict: "id" },
        );
        if (error) throw error;
        report.imported.imagesUploaded += 1;
      }
      stored = {
        assetId: resolvedAssetId,
        path,
        width: optimized.width,
        height: optimized.height,
      };
      contentCache.set(contentHash, stored);
    }
    return {
      ...stored,
      alt: media?.alt_text.trim() || null,
      mediaId: source.image.id || null,
    };
  })();
  transferCache.set(reference, transfer);
  return transfer;
}

async function targetImages(
  prepared: PreparedProduct,
  woo: WooCommerceReader,
  client: SupabaseClient<Database> | null,
  report: MigrationReport,
  mediaCache: Map<
    number,
    Awaited<ReturnType<WooCommerceReader["media"]>> | null
  >,
  transferCache: Map<string, Promise<MediaTransfer>>,
  contentCache: Map<string, StoredImage>,
  contentReferences: Map<string, Set<string>>,
  imageCacheDirectory: string,
) {
  const images: TargetImage[] = [];
  for (const source of prepared.imageSources) {
    try {
      const media = await transferMedia(
        source,
        woo,
        client,
        report,
        mediaCache,
        transferCache,
        contentCache,
        contentReferences,
        imageCacheDirectory,
      );
      images.push({
        id: deterministicUuid(
          `woocommerce:product:${source.productId}:image:${source.occurrenceId}`,
        ),
        variant_id: source.variantId,
        path: media.path,
        alt:
          media.alt ||
          textFromHtml(source.image.alt) ||
          textFromHtml(source.image.name) ||
          source.productTitle,
        width: media.width,
        height: media.height,
        is_primary: source.isPrimary,
        sort_order: source.sortOrder,
        asset_id: media.assetId,
        legacy_wordpress_media_id: media.mediaId,
      });
    } catch (error) {
      report.errors.push({
        scope: "image",
        sourceId: source.image.id
          ? String(source.image.id)
          : source.occurrenceId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return images;
}

async function collectionId(
  term: WooTerm,
  client: SupabaseClient<Database> | null,
) {
  const fallbackId = deterministicUuid(`woocommerce:category:${term.id}`);
  if (!client) return fallbackId;
  const [
    { data: byLegacy, error: legacyError },
    { data: bySlug, error: slugError },
  ] = await Promise.all([
    client
      .from("collections")
      .select("id,slug")
      .eq("legacy_woocommerce_id", term.id)
      .maybeSingle(),
    client
      .from("collections")
      .select("id,slug")
      .eq("slug", slug(term.slug, `wc-category-${term.id}`))
      .maybeSingle(),
  ]);
  if (legacyError || slugError) throw legacyError ?? slugError;
  if (byLegacy && bySlug && byLegacy.id !== bySlug.id)
    throw new Error(
      `Category ${term.id} conflicts with the existing slug ${term.slug}.`,
    );
  const id = byLegacy?.id ?? bySlug?.id ?? fallbackId;
  const { error } = await client.from("collections").upsert(
    {
      id,
      legacy_woocommerce_id: term.id,
      slug: slug(term.slug || term.name, `wc-category-${term.id}`),
      name: textFromHtml(term.name),
      active: true,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  return id;
}

async function tagId(term: WooTerm, client: SupabaseClient<Database> | null) {
  const fallbackId = deterministicUuid(`woocommerce:tag:${term.id}`);
  if (!client) return fallbackId;
  const [
    { data: byLegacy, error: legacyError },
    { data: bySlug, error: slugError },
  ] = await Promise.all([
    client
      .from("tags")
      .select("id,slug")
      .eq("legacy_woocommerce_id", term.id)
      .maybeSingle(),
    client
      .from("tags")
      .select("id,slug")
      .eq("slug", slug(term.slug, `wc-tag-${term.id}`))
      .maybeSingle(),
  ]);
  if (legacyError || slugError) throw legacyError ?? slugError;
  if (byLegacy && bySlug && byLegacy.id !== bySlug.id)
    throw new Error(
      `Tag ${term.id} conflicts with the existing slug ${term.slug}.`,
    );
  const id = byLegacy?.id ?? bySlug?.id ?? fallbackId;
  const { error } = await client.from("tags").upsert(
    {
      id,
      legacy_woocommerce_id: term.id,
      slug: slug(term.slug || term.name, `wc-tag-${term.id}`),
      name: textFromHtml(term.name),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  return id;
}

function asJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function importProduct(
  prepared: PreparedProduct,
  images: TargetImage[],
  client: SupabaseClient<Database> | null,
) {
  const collectionIds = await Promise.all(
    prepared.categories.map((term) => collectionId(term, client)),
  );
  const tagIds = await Promise.all(
    prepared.tags.map((term) => tagId(term, client)),
  );
  if (!client) return prepared.product.id;
  const { data, error } = await client.rpc("import_woocommerce_product", {
    document: asJson({
      product: prepared.product,
      options: prepared.options,
      variants: prepared.variants,
      images,
      collection_ids: collectionIds,
      tag_ids: tagIds,
    }),
  });
  if (error) throw error;
  return data;
}

async function loadEnvironment() {
  for (const file of [".env.development.local", ".env.local"]) {
    try {
      await access(file);
      process.loadEnvFile(file);
    } catch {
      // Each file is optional; required variables are checked below.
    }
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const details = ["code", "message", "details", "hint"]
      .flatMap((key) =>
        typeof value[key] === "string" && value[key]
          ? [`${key}: ${value[key]}`]
          : [],
      )
      .join("; ");
    if (details) return details;
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown structured error";
    }
  }
  return String(error);
}

async function writeReport(path: string, report: MigrationReport) {
  report.completedAt = new Date().toISOString();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
}

async function run() {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      report: { type: "string" },
      "product-id": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Usage: npm run migration:woocommerce -- [--dry-run] [--apply] [--product-id id] [--report path]\n\nDry-run is the default. --apply writes only to the configured Macmaer Supabase project; WooCommerce is always GET-only.",
    );
    return;
  }
  if (values.apply && values["dry-run"])
    throw new Error("Choose either --dry-run or --apply, not both.");
  await loadEnvironment();
  const mode: MigrationReport["mode"] = values.apply ? "apply" : "dry-run";
  const requestedProductId = values["product-id"]
    ? Number(values["product-id"])
    : null;
  if (
    requestedProductId !== null &&
    (!Number.isInteger(requestedProductId) || requestedProductId <= 0)
  )
    throw new Error("--product-id must be a positive integer.");
  const wooUrl = requiredEnvironment("WOOCOMMERCE_URL");
  const woo = new WooCommerceReader(
    wooUrl,
    requiredEnvironment("WOOCOMMERCE_CONSUMER_KEY"),
    requiredEnvironment("WOOCOMMERCE_CONSUMER_SECRET"),
  );
  let client: SupabaseClient<Database> | null = null;
  let targetOrigin: string | null = null;
  if (mode === "apply") {
    const supabaseUrl = new URL(
      requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    );
    if (
      supabaseUrl.protocol !== "https:" &&
      supabaseUrl.hostname !== "127.0.0.1"
    )
      throw new Error(
        "The Supabase target must use HTTPS or the local 127.0.0.1 stack.",
      );
    targetOrigin = supabaseUrl.origin;
    client = createClient<Database>(
      supabaseUrl.href,
      requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }
  const reportPath = resolve(
    values.report ??
      `migration/woocommerce-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  const report = createReport(mode, woo.origin, targetOrigin);
  const productTargets = new Map<number, string>();
  const mediaCache = new Map<
    number,
    Awaited<ReturnType<WooCommerceReader["media"]>> | null
  >();
  const transferCache = new Map<string, Promise<MediaTransfer>>();
  const contentCache = new Map<string, StoredImage>();
  const contentReferences = new Map<string, Set<string>>();
  const imagePlacements: SourceImage[] = [];
  const imageCacheDirectory = resolve("migration/.woocommerce-image-cache");

  try {
    console.log(
      `${mode === "apply" ? "APPLY" : "DRY RUN"}: reading published products from ${woo.origin}.`,
    );
    if (client) console.log(`Target Supabase origin: ${targetOrigin}.`);
    const context = await storeContext(woo, report);
    Object.assign(report.source, {
      currency: context.currency,
      decimals: context.decimals,
      weightUnit: context.weightUnit,
      dimensionUnit: context.dimensionUnit,
    });
    const sourceProducts = await woo.pages("products", {
      status: "publish",
      orderby: "id",
      order: "asc",
    });
    const rawProducts = requestedProductId
      ? sourceProducts.filter(
          (value) => objectValue(value)?.id === requestedProductId,
        )
      : sourceProducts;
    if (requestedProductId && rawProducts.length !== 1)
      throw new Error(
        `Published WooCommerce product ${requestedProductId} was not found.`,
      );
    report.source.publishedProducts = rawProducts.length;

    for (const [productIndex, rawProduct] of rawProducts.entries()) {
      const parsed = wooProductSchema.safeParse(rawProduct);
      if (!parsed.success) {
        report.skippedRecords.push({
          scope: "product",
          sourceId: "unknown",
          reason: `Invalid WooCommerce product payload: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
        });
        continue;
      }
      const product = parsed.data;
      try {
        console.log(
          `[${productIndex + 1}/${rawProducts.length}] validating WooCommerce product ${product.id}.`,
        );
        const rawVariations = product.variations.length
          ? await woo.pages(`products/${product.id}/variations`, {
              status: "any",
              orderby: "id",
              order: "asc",
            })
          : [];
        report.source.variations += rawVariations.length;
        const prepared = prepareProduct(
          product,
          rawVariations,
          context,
          report,
        );
        report.source.imageOccurrences += prepared.imageSources.length;
        imagePlacements.push(...prepared.imageSources);
        if (prepared.specialMapping)
          report.specialMappings.push(prepared.specialMapping);
        const images = await targetImages(
          prepared,
          woo,
          client,
          report,
          mediaCache,
          transferCache,
          contentCache,
          contentReferences,
          imageCacheDirectory,
        );
        if (images.length !== prepared.imageSources.length)
          throw new Error(
            "Not every product image could be transferred; the product was not written.",
          );
        const destinationId = await importProduct(prepared, images, client);
        productTargets.set(product.id, destinationId);
        report.products.push({
          legacyWooCommerceId: product.id,
          slug: prepared.product.slug,
          destinationId,
          destinationStatus: "draft",
          options: prepared.options.length,
          variants: prepared.variants.length,
          images: images.length,
          result: client ? "imported" : "planned",
        });
        if (client) {
          report.imported.products += 1;
          report.imported.options += prepared.options.length;
          report.imported.variants += prepared.variants.length;
        }
      } catch (error) {
        const reason = errorMessage(error);
        report.errors.push({
          scope: "product",
          sourceId: String(product.id),
          reason,
        });
        report.products.push({
          legacyWooCommerceId: product.id,
          slug: slug(product.slug || product.name, `wc-product-${product.id}`),
          destinationId: deterministicUuid(`woocommerce:product:${product.id}`),
          destinationStatus: "draft",
          options: 0,
          variants: 0,
          images: 0,
          result: "error",
        });
      }
    }

    const rawReviews = await woo.pages("products/reviews", {
      status: "approved",
      orderby: "id",
      order: "asc",
    });
    report.source.approvedReviews = rawReviews.length;
    for (const rawReview of rawReviews) {
      try {
        const review = prepareReview(rawReview);
        if (!review) {
          const id = objectValue(rawReview)?.id;
          report.skippedRecords.push({
            scope: "review",
            sourceId: String(id ?? "unknown"),
            reason:
              "The approved review body is shorter than 10 characters after sanitization.",
          });
          continue;
        }
        const productId = productTargets.get(review.productLegacyId);
        if (!productId) {
          report.skippedRecords.push({
            scope: "review",
            sourceId: review.sourceReference,
            reason:
              "Its published product was not available in this migration run.",
          });
          continue;
        }
        if (client) {
          const { error } = await client.from("product_reviews").upsert(
            {
              product_id: productId,
              order_id: null,
              display_name: review.displayName,
              email_hash: null,
              rating: review.rating,
              title: "",
              body: review.body,
              status: "APPROVED",
              verified_purchase: review.verifiedPurchase,
              source: "WOOCOMMERCE",
              source_reference: review.sourceReference,
              created_at: review.createdAt ?? undefined,
            },
            {
              onConflict: "source,source_reference",
              ignoreDuplicates: true,
            },
          );
          if (error) throw error;
          report.imported.reviews += 1;
        }
      } catch (error) {
        const id = objectValue(rawReview)?.id;
        report.errors.push({
          scope: "review",
          sourceId: String(id ?? "unknown"),
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    report.imported.collections = new Set(
      rawProducts.flatMap((value) => {
        const parsed = wooProductSchema.safeParse(value);
        return parsed.success
          ? parsed.data.categories.map((term) => term.id)
          : [];
      }),
    ).size;
    report.imported.tags = new Set(
      rawProducts.flatMap((value) => {
        const parsed = wooProductSchema.safeParse(value);
        return parsed.success ? parsed.data.tags.map((term) => term.id) : [];
      }),
    ).size;
  } catch (error) {
    report.errors.push({
      scope: "migration",
      sourceId: "run",
      reason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    finalizeImageAudit(report, imagePlacements, contentReferences);
    finalizeUnmappedSummary(report);
    await writeReport(reportPath, report);
  }

  console.log(
    `${mode === "apply" ? "Imported" : "Planned"} ${report.products.filter((product) => product.result !== "error").length} products, ${report.source.variations} source variations, ${report.source.imageOccurrences} image placements, and ${report.source.approvedReviews} approved reviews.`,
  );
  console.log(
    `Report: ${reportPath}. Unmapped fields: ${report.unmappedFields.length}; skipped: ${report.skippedRecords.length}; errors: ${report.errors.length}.`,
  );
  if (report.errors.length) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
