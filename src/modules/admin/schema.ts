import { z } from "zod";
import {
  productSchema,
  optionSchema,
  variantSchema,
  optionValueSchema,
  collectionSchema,
  type Product,
} from "@/modules/catalog/schema";
import { amountSchema, minorUnitsInput } from "./money";
const key = z
  .string()
  .regex(
    /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/,
    "Use lowercase words separated by hyphens or underscores.",
  )
  .max(100);
const name = z.string().trim().min(1).max(200);
const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase words separated by hyphens.",
  )
  .max(100);
const integer = z.number().int().min(-2147483648).max(2147483647);
export const adminProductSchema = productSchema
  .extend({
    title: name,
    slug,
    currency: z.literal("SEK"),
    tax_category_key: z.null(),
    sku: z.string().trim().min(1).max(100).nullable(),
    base_price: amountSchema(),
    compare_at_price: amountSchema(false, true),
    dimensions: z.partialRecord(
      z.enum(["length_cm", "width_cm", "height_cm"]),
      z.number().positive().max(10000),
    ),
    options: z
      .array(
        optionSchema.extend({
          key,
          label: name,
          values: z.array(
            optionValueSchema.extend({
              key,
              label: name,
              price_delta: amountSchema(true),
              weight_delta_grams: integer,
            }),
          ),
        }),
      )
      .max(30),
    variants: z
      .array(
        variantSchema.extend({
          sku: name,
          title: name,
          price_override: amountSchema(false, true),
          price_delta: amountSchema(true, true),
          compare_at_price: amountSchema(false, true),
        }),
      )
      .max(500),
    images: productSchema.shape.images.max(50),
  })
  .superRefine((p, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (p.base_price === null) issue(["base_price"], "Price is required.");
    if (p.compare_at_price !== null && p.compare_at_price < (p.base_price ?? 0))
      issue(
        ["compare_at_price"],
        "Compare-at price must be at least the base price.",
      );
    if (p.status === "active" && !p.sku)
      issue(["sku"], "A unique product SKU is required before publication.");
    if (p.inventory_strategy === "TRACKED" && p.stock_quantity === null)
      issue(["stock_quantity"], "Enter tracked stock.");
    const ids = new Set<string>();
    const unique = (id: string, path: (string | number)[]) => {
      if (ids.has(id)) issue(path, "Duplicate record identity.");
      ids.add(id);
    };
    const keys = new Set<string>(),
      combinations = new Set<string>(),
      skus = new Set(p.sku ? [p.sku] : []);
    const axes = p.options.filter((o) => o.is_variant_axis);
    p.options.forEach((o, i) => {
      const path = ["options", i];
      unique(o.id, path);
      if (o.display_type !== "repeated_select" && o.repeat_count !== 1)
        issue(path, "Only repeated selections have a repeat count above one.");
      if (keys.has(o.key))
        issue([...path, "key"], "Option keys must be unique.");
      keys.add(o.key);
      if (
        o.is_variant_axis &&
        (!o.required ||
          !["select", "radio", "colour_swatch", "image_swatch"].includes(
            o.display_type,
          ))
      )
        issue(path, "Variant axes must be required single selections.");
      if (o.max_selections !== null && o.max_selections < o.min_selections)
        issue(path, "Maximum selections must be at least the minimum.");
      if (
        o.display_type === "repeated_select" &&
        ((o.max_selections !== null && o.max_selections < o.repeat_count) ||
          o.min_selections > o.repeat_count)
      )
        issue(path, "Selection limits must include the repeat count.");
      if (
        o.display_type === "repeated_select" &&
        !o.allow_duplicates &&
        o.values.filter((v) => v.active).length < o.repeat_count
      )
        issue(
          path,
          "Provide enough distinct values for every repeated selection.",
        );
      if (["short_text", "number"].includes(o.display_type) && o.values.length)
        issue(path, "Text and number options do not have choice values.");
      const rules = o.validation_rules;
      if (
        rules.min !== undefined &&
        rules.max !== undefined &&
        rules.min > rules.max
      )
        issue(path, "Minimum must not exceed maximum.");
      const valueKeys = new Set<string>();
      o.values.forEach((v, j) => {
        unique(v.id, [...path, "values", j]);
        if (valueKeys.has(v.key))
          issue([...path, "values", j, "key"], "Value keys must be unique.");
        valueKeys.add(v.key);
        if (v.colour_hex && !/^#[0-9a-f]{6}$/i.test(v.colour_hex))
          issue(
            [...path, "values", j, "colour_hex"],
            "Use a six-digit hex colour.",
          );
      });
    });
    p.variants.forEach((v, i) => {
      const path = ["variants", i];
      unique(v.id, path);
      if (skus.has(v.sku)) issue([...path, "sku"], "SKUs must be unique.");
      skus.add(v.sku);
      if (v.price_override !== null && v.price_delta !== null)
        issue(path, "Choose a price override or adjustment, not both.");
      if ((v.price_override ?? (p.base_price ?? 0) + (v.price_delta ?? 0)) < 0)
        issue(path, "Variant price cannot be negative.");
      if (v.inventory_strategy === "TRACKED" && v.stock_quantity === null)
        issue(path, "Enter tracked stock.");
      if (
        !axes.length ||
        v.value_ids.length !== axes.length ||
        new Set(v.value_ids).size !== axes.length ||
        axes.some(
          (o) =>
            o.values.filter((x) => x.active && v.value_ids.includes(x.id))
              .length !== 1,
        )
      )
        issue(path, "Select one active value from every variant axis.");
      const combination = [...v.value_ids].sort().join();
      if (combinations.has(combination))
        issue(path, "This variant combination already exists.");
      combinations.add(combination);
    });
    if (
      p.status === "active" &&
      axes.length &&
      !p.variants.some((v) => v.active)
    )
      issue(["variants"], "Add an active variant before publishing.");
    p.images.forEach((image, i) => {
      unique(image.id, ["images", i]);
      if (!image.asset_id && !/^\/images\/[\w./-]+$/.test(image.path))
        issue(["images", i], "Choose an uploaded image.");
      if (
        image.variant_id &&
        !p.variants.some((v) => v.id === image.variant_id)
      )
        issue(["images", i], "Choose a variant belonging to this product.");
    });
    if (p.images.length && p.images.filter((i) => i.is_primary).length !== 1)
      issue(["images"], "Choose exactly one primary image.");
  });
export type ProductInput = z.input<typeof adminProductSchema>;
export function productInput(product: Product): ProductInput {
  return {
    ...product,
    currency: "SEK",
    tax_category_key: null,
    base_price: minorUnitsInput(product.base_price),
    compare_at_price: minorUnitsInput(product.compare_at_price),
    options: product.options.map((o) => ({
      ...o,
      values: o.values.map((v) => ({
        ...v,
        price_delta: minorUnitsInput(v.price_delta),
      })),
    })),
    variants: product.variants.map((v) => ({
      ...v,
      price_override: minorUnitsInput(v.price_override),
      price_delta: minorUnitsInput(v.price_delta),
      compare_at_price: minorUnitsInput(v.compare_at_price),
    })),
    dimensions: product.dimensions as Record<
      "length_cm" | "width_cm" | "height_cm",
      number
    >,
  };
}
export function newProduct(): ProductInput {
  return {
    id: crypto.randomUUID(),
    title: "",
    slug: "",
    subtitle: null,
    short_description: "",
    description: "",
    description_document: null,
    materials: "",
    care: "",
    status: "draft",
    base_price: "0.00",
    compare_at_price: "",
    currency: "SEK",
    sku: null,
    tax_category_key: null,
    inventory_strategy: "MADE_TO_ORDER",
    stock_quantity: null,
    processing_time: null,
    weight_grams: null,
    dimensions: {} as ProductInput["dimensions"],
    return_policy_class: "standard",
    featured: false,
    sort_order: 0,
    seo_title: null,
    seo_description: null,
    created_at: "",
    updated_at: "",
    images: [],
    options: [],
    variants: [],
    collections: [],
    tags: [],
  };
}
export function duplicateProduct(p: ProductInput): ProductInput {
  const values = new Map<string, string>(),
    variants = new Map<string, string>();
  return {
    ...p,
    id: crypto.randomUUID(),
    title: p.title + " (copy)",
    slug: p.slug + "-copy-" + crypto.randomUUID().slice(0, 8),
    sku: null,
    status: "draft",
    created_at: "",
    updated_at: "",
    options: p.options.map((o) => ({
      ...o,
      id: crypto.randomUUID(),
      values: o.values.map((v) => {
        const id = crypto.randomUUID();
        values.set(v.id, id);
        return { ...v, id };
      }),
    })),
    variants: p.variants.map((v) => {
      const id = crypto.randomUUID();
      variants.set(v.id, id);
      return {
        ...v,
        id,
        sku: "COPY-" + id.slice(0, 8),
        value_ids: v.value_ids.map((id) => values.get(id)!),
      };
    }),
    images: p.images.map((i) => ({
      ...i,
      id: crypto.randomUUID(),
      variant_id: i.variant_id ? (variants.get(i.variant_id) ?? null) : null,
    })),
  };
}
export const adminCollectionSchema = collectionSchema.extend({
  slug,
  name,
});
export const adminTagSchema = z.object({
  id: z.uuid(),
  name,
  slug,
  updated_at: z.string().optional(),
});
