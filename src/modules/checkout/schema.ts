import { z } from "zod";
import { countryCodeSchema } from "@/modules/country/countries";
import { currencySchema } from "@/modules/currency/schema";

const trimmed = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

export const checkoutAddressSchema = z
  .object({
    name: trimmed(1, 160),
    line1: trimmed(1, 200),
    line2: z.string().trim().max(200).default(""),
    postalCode: trimmed(1, 30),
    city: trimmed(1, 120),
    region: z.string().trim().max(120).default(""),
    country: countryCodeSchema,
  })
  .strict();

export const createCheckoutSchema = z
  .object({
    checkoutAttemptId: z.uuid(),
    accessToken: z.string().min(32).max(200),
    email: z.email().trim().max(320),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(40)
      .refine(
        (value) => value.replace(/\D/g, "").length >= 7,
        "Enter a valid telephone number.",
      ),
    shippingAddress: checkoutAddressSchema,
    billingSameAsShipping: z.boolean(),
    billingAddress: checkoutAddressSchema.nullable(),
    acceptTerms: z.literal(true),
  })
  .strict()
  .refine(
    (value) => value.billingSameAsShipping || value.billingAddress !== null,
    { path: ["billingAddress"], message: "Enter a billing address." },
  );

export const quoteRequestSchema = z
  .object({ country: countryCodeSchema })
  .strict();

export const checkoutStatusSchema = z.object({
  orderId: z.uuid(),
});

export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CheckoutSummary = {
  currency: z.infer<typeof currencySchema>;
  merchandiseAmount: number;
  discountAmount: number;
  shippingAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxMessage: string;
  shippingMethod: string;
};

export type CreateCheckoutResult = {
  orderId: string;
  orderNumber: string;
  clientSecret: string;
  summary: CheckoutSummary;
  notice?: string;
};

export class CheckoutError extends Error {
  override name = "CheckoutError";
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
