import { z } from "zod";
import { currencySchema } from "@/modules/currency/schema";

export class CartValidationError extends Error {
  override name = "CartValidationError";
}

export const rawSelectionsSchema = z
  .record(z.string().min(1).max(80), z.array(z.string().max(240)).max(20))
  .refine((value) => Object.keys(value).length <= 30, "Too many options.");

export const cartOptionValueSchema = z.object({
  id: z.string().nullable(),
  key: z.string().nullable(),
  label: z.string(),
  input: z.string(),
});
export const cartOptionSnapshotSchema = z.object({
  optionId: z.string(),
  key: z.string(),
  label: z.string(),
  displayType: z.string(),
  values: z.array(cartOptionValueSchema),
});
export const cartOptionsSnapshotSchema = z.array(cartOptionSnapshotSchema);

export const addCartItemSchema = z.object({
  productId: z.uuid(),
  selections: rawSelectionsSchema,
  quantity: z.number().int().min(1).max(99),
});
export const updateCartItemSchema = z.object({
  lineId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});

export type CartOptionSnapshot = z.infer<typeof cartOptionSnapshotSchema>;
export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  productSlug: string;
  sku: string | null;
  imagePath: string | null;
  options: CartOptionSnapshot[];
  quantity: number;
  baseUnitAmount: number;
  displayUnitAmount: number;
  displayCurrency: z.infer<typeof currencySchema>;
  taxCategoryKey: string;
  shippingClassKey: string;
  collectionIds: string[];
  unitWeightGrams: number | null;
  valid: boolean;
  message: string | null;
};
export type CartView = {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  currency: z.infer<typeof currencySchema>;
  destinationCountry: string;
  discountCode: string | null;
};
export type MiniCartLine = {
  id: string;
  productTitle: string;
  productSlug: string;
  imagePath: string | null;
  quantity: number;
  displayUnitAmount: number;
};
export type MiniCartView = {
  lines: MiniCartLine[];
  lineCount: number;
  itemCount: number;
  subtotal: number;
  currency: z.infer<typeof currencySchema>;
};
export type CartActionResult =
  | { ok: true; message: string; itemCount: number }
  | { ok: false; message: string };
