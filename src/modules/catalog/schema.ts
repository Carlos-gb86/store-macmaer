import { z } from "zod";
const money = z.number().int().nonnegative().max(2147483647);
const inventory = z.enum([
  "TRACKED",
  "MADE_TO_ORDER",
  "UNLIMITED",
  "UNAVAILABLE",
]);
export const imageSchema = z.object({
  id: z.uuid(),
  path: z.string(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  is_primary: z.boolean(),
  sort_order: z.number().int(),
  variant_id: z.uuid().nullable(),
});
export const optionValueSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  label: z.string(),
  colour_hex: z.string().nullable(),
  image_path: z.string().nullable(),
  price_delta: z.number().int(),
  weight_delta_grams: z.number().int(),
  active: z.boolean(),
  sort_order: z.number().int(),
});
export const optionSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  label: z.string(),
  display_type: z.enum([
    "select",
    "radio",
    "colour_swatch",
    "image_swatch",
    "checkbox",
    "short_text",
    "number",
    "repeated_select",
  ]),
  required: z.boolean(),
  is_variant_axis: z.boolean(),
  affects_price: z.boolean(),
  affects_weight: z.boolean(),
  min_selections: z.number().int().nonnegative(),
  max_selections: z.number().int().nullable(),
  repeat_count: z.number().int().min(1).max(20),
  allow_duplicates: z.boolean(),
  validation_rules: z.object({
    max_length: z.number().int().positive().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
  }),
  sort_order: z.number().int(),
  values: z.array(optionValueSchema),
});
export const variantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  title: z.string(),
  price_override: money.nullable(),
  price_delta: z.number().int().nullable(),
  compare_at_price: money.nullable(),
  weight_override_grams: z.number().int().nullable(),
  inventory_strategy: inventory,
  stock_quantity: z.number().int().nonnegative().nullable(),
  active: z.boolean(),
  sort_order: z.number().int(),
  value_ids: z.array(z.uuid()),
});
export const productSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  short_description: z.string(),
  description: z.string(),
  materials: z.string(),
  care: z.string(),
  status: z.enum(["draft", "active", "archived"]),
  base_price: money,
  compare_at_price: money.nullable(),
  currency: z.enum(["SEK", "EUR", "USD"]),
  sku: z.string().nullable(),
  tax_category_key: z.string().nullable(),
  inventory_strategy: inventory,
  stock_quantity: z.number().int().nonnegative().nullable(),
  processing_time: z.string().nullable(),
  weight_grams: z.number().int().nullable(),
  dimensions: z.record(z.string(), z.unknown()),
  return_policy_class: z.enum(["standard", "customized", "final_sale"]),
  featured: z.boolean(),
  sort_order: z.number().int(),
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  images: z.array(imageSchema),
  options: z.array(optionSchema),
  variants: z.array(variantSchema),
  collections: z.array(z.string()),
  tags: z.array(z.string()),
});
export const collectionSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  image_path: z.string().nullable(),
  image_alt: z.string(),
  active: z.boolean(),
  sort_order: z.number().int(),
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
});
export const catalogueSchema = z.object({
  products: z.array(productSchema),
  collections: z.array(collectionSchema),
});
export type Product = z.infer<typeof productSchema>;
export type ProductOption = z.infer<typeof optionSchema>;
export type ProductVariant = z.infer<typeof variantSchema>;
export type ProductImage = z.infer<typeof imageSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Catalogue = z.infer<typeof catalogueSchema>;
