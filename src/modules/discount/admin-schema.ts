import { z } from "zod";
import { amountSchema } from "@/modules/admin/money";

const optionalTimestamp = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time." });
      return z.NEVER;
    }
    return date.toISOString();
  });

export const discountsAdminSchema = z
  .array(
    z.object({
      id: z.uuid(),
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9][A-Z0-9_-]{1,39}$/),
      name: z.string().trim().min(1).max(120),
      kind: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
      percentage_basis_points: z.number().int().min(1).max(10_000).nullable(),
      fixed_amount: amountSchema(false, true),
      minimum_subtotal: amountSchema().pipe(z.number()),
      starts_at: optionalTimestamp,
      ends_at: optionalTimestamp,
      active: z.boolean(),
      total_usage_limit: z.number().int().positive().nullable(),
      per_customer_limit: z.number().int().positive().nullable(),
      product_ids: z.array(z.uuid()).max(1_000),
      collection_ids: z.array(z.uuid()).max(1_000),
    }),
  )
  .max(1_000)
  .superRefine((discounts, ctx) => {
    if (
      new Set(discounts.map((discount) => discount.code)).size !==
      discounts.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Discount codes must be unique.",
      });
    discounts.forEach((discount, index) => {
      if (
        discount.kind === "PERCENTAGE" &&
        discount.percentage_basis_points === null
      )
        ctx.addIssue({
          code: "custom",
          path: [index, "percentage_basis_points"],
          message: "Enter a percentage.",
        });
      if (discount.kind === "FIXED_AMOUNT" && discount.fixed_amount === null)
        ctx.addIssue({
          code: "custom",
          path: [index, "fixed_amount"],
          message: "Enter a fixed amount.",
        });
      if (
        discount.starts_at &&
        discount.ends_at &&
        new Date(discount.ends_at) <= new Date(discount.starts_at)
      )
        ctx.addIssue({
          code: "custom",
          path: [index, "ends_at"],
          message: "The end must be after the start.",
        });
    });
  })
  .transform((discounts) =>
    discounts.map((discount) => ({
      ...discount,
      percentage_basis_points:
        discount.kind === "PERCENTAGE"
          ? discount.percentage_basis_points
          : null,
      fixed_amount:
        discount.kind === "FIXED_AMOUNT" ? discount.fixed_amount : null,
    })),
  );
export type DiscountsAdminInput = z.input<typeof discountsAdminSchema>;
