import { z } from "zod";
import { amountSchema } from "@/modules/admin/money";
import { countryCodeSchema } from "@/modules/country/countries";

const key = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
  .max(100);
const name = z.string().trim().min(1).max(120);
const optionalAmount = amountSchema(false, true);

const ruleSchema = z.object({
  id: z.uuid(),
  calculation_type: z.enum(["FLAT", "BASE_PLUS_ADDITIONAL", "PER_ITEM"]),
  base_amount: amountSchema().pipe(z.number()),
  additional_item_amount: amountSchema().pipe(z.number()),
  min_weight_grams: z.number().int().nonnegative(),
  max_weight_grams: z.number().int().nonnegative().nullable(),
  min_subtotal: amountSchema().pipe(z.number()),
  max_subtotal: optionalAmount,
  package_class_key: key.nullable(),
  free_shipping_threshold: optionalAmount,
  threshold_basis: z.enum(["BEFORE_DISCOUNT", "AFTER_DISCOUNT"]),
  price_includes_vat: z.boolean(),
  shipping_tax_category_key: key,
  active: z.boolean(),
  priority: z.number().int(),
});
const methodSchema = z.object({
  id: z.uuid(),
  name,
  carrier: z.string().trim().max(120).nullable(),
  tracked: z.boolean(),
  estimated_delivery: z.string().trim().max(240),
  active: z.boolean(),
  sort_order: z.number().int(),
  rules: z.array(ruleSchema).max(100),
});
const zoneSchema = z.object({
  id: z.uuid(),
  key,
  name,
  active: z.boolean(),
  sort_order: z.number().int(),
  methods: z.array(methodSchema).max(30),
});

export const shippingAdminSchema = z
  .object({
    packaging_weight_grams: z.number().int().nonnegative().max(1_000_000),
    package_classes: z
      .array(z.object({ key, name, active: z.boolean() }))
      .min(1)
      .max(50),
    countries: z
      .array(z.object({ country_code: countryCodeSchema, zone_id: z.uuid() }))
      .min(1)
      .max(249),
    zones: z.array(zoneSchema).min(1).max(50),
  })
  .superRefine((value, ctx) => {
    const zoneIds = new Set(value.zones.map((zone) => zone.id));
    if (zoneIds.size !== value.zones.length)
      ctx.addIssue({
        code: "custom",
        path: ["zones"],
        message: "Duplicate zone.",
      });
    if (
      new Set(value.zones.map((zone) => zone.key)).size !== value.zones.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["zones"],
        message: "Zone keys must be unique.",
      });
    if (
      new Set(value.countries.map((country) => country.country_code)).size !==
      value.countries.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["countries"],
        message: "A country can belong to only one zone.",
      });
    value.countries.forEach((country, index) => {
      if (!zoneIds.has(country.zone_id))
        ctx.addIssue({
          code: "custom",
          path: ["countries", index],
          message: "Choose a saved zone.",
        });
    });
    value.zones.forEach((zone, zoneIndex) => {
      if (zone.active && !zone.methods.some((method) => method.active))
        ctx.addIssue({
          code: "custom",
          path: ["zones", zoneIndex, "methods"],
          message: "Active zones need an active service.",
        });
      zone.methods.forEach((method, methodIndex) => {
        if (method.active && !method.rules.some((rule) => rule.active))
          ctx.addIssue({
            code: "custom",
            path: ["zones", zoneIndex, "methods", methodIndex, "rules"],
            message: "Active services need an active rate rule.",
          });
        method.rules.forEach((rule, ruleIndex) => {
          if (
            rule.max_weight_grams !== null &&
            rule.max_weight_grams < rule.min_weight_grams
          )
            ctx.addIssue({
              code: "custom",
              path: [
                "zones",
                zoneIndex,
                "methods",
                methodIndex,
                "rules",
                ruleIndex,
                "max_weight_grams",
              ],
              message: "Maximum weight must be at least the minimum.",
            });
          if (
            rule.max_subtotal !== null &&
            rule.max_subtotal < rule.min_subtotal
          )
            ctx.addIssue({
              code: "custom",
              path: [
                "zones",
                zoneIndex,
                "methods",
                methodIndex,
                "rules",
                ruleIndex,
                "max_subtotal",
              ],
              message: "Maximum subtotal must be at least the minimum.",
            });
        });
      });
    });
  });

export type ShippingAdminInput = z.input<typeof shippingAdminSchema>;
