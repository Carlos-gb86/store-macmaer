import { z } from "zod";
import { amountSchema } from "@/modules/admin/money";

export const fulfilmentInputSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"]),
  carrier: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["POSTNORD", "UPS"]).optional(),
  ),
  trackingNumber: z.string().trim().max(200).optional(),
  trackingUrl: z
    .union([
      z
        .url()
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "Use an HTTP or HTTPS link.",
        ),
      z.literal(""),
    ])
    .optional(),
});

export const orderNoteSchema = z.object({
  orderId: z.uuid(),
  note: z.string().trim().min(1).max(2000),
});

export const refundInputSchema = z.object({
  orderId: z.uuid(),
  requestKey: z.uuid(),
  orderNumber: z.string().regex(/^MAC-\d{4}-\d{6}$/),
  confirmation: z.string(),
  amount: amountSchema().pipe(z.number()),
  reason: z.enum(["REQUESTED_BY_CUSTOMER", "DUPLICATE", "FRAUDULENT", "OTHER"]),
  note: z.string().trim().max(1000).optional(),
});

export const resendEmailSchema = z.object({
  orderId: z.uuid(),
  kind: z.enum([
    "ORDER_CONFIRMATION",
    "SHIPPING_CONFIRMATION",
    "REFUND_CONFIRMATION",
  ]),
  refundId: z.union([z.uuid(), z.literal("")]).optional(),
});
