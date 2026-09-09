import { z } from "zod";
import { countryCodeSchema } from "@/modules/country/countries";

const key = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
  .max(100);
export const taxAdminSchema = z.object({
  eu_mode: z.enum(["SWEDISH_ORIGIN", "DESTINATION"]),
  catalogue_prices_include_vat: z.boolean(),
  export_rate_basis_points: z.number().int().min(0).max(10_000),
  export_message: z.string().trim().min(1).max(500),
  reviewed_at: z.string().datetime().nullable(),
  categories: z
    .array(
      z.object({
        key,
        name: z.string().trim().min(1).max(120),
        active: z.boolean(),
      }),
    )
    .min(1)
    .max(50),
  rules: z
    .array(
      z.object({
        id: z.uuid(),
        country_code: countryCodeSchema,
        tax_category_key: key,
        rate_basis_points: z.number().int().min(0).max(10_000),
        valid_from: z.iso.date(),
        valid_to: z.iso.date().nullable(),
        enabled: z.boolean(),
        source: z.string().trim().max(500),
        reviewed_at: z.string().datetime().nullable(),
      }),
    )
    .max(2_000),
});
export type TaxAdminInput = z.input<typeof taxAdminSchema>;
