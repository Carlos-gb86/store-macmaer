"use server";

import type Stripe from "stripe";
import { refresh } from "next/cache";
import { requireAdmin } from "@/modules/admin/auth";
import { mutationError } from "@/modules/admin/errors";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getServerEnv } from "@/lib/env/server";
import { getStripe } from "@/modules/payments/stripe";
import {
  deliverOrderConfirmationEmail,
  deliverRefundEmail,
  deliverShippingEmail,
} from "@/modules/email/service";
import {
  fulfilmentInputSchema,
  orderNoteSchema,
  refundInputSchema,
  resendEmailSchema,
} from "./schema";

export type OrderActionState =
  { ok: true; message: string } | { ok: false; message: string } | null;

function input(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function setFulfilmentAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  try {
    const value = fulfilmentInputSchema.parse(input(formData));
    const { client } = await requireAdmin();
    const { error } = await client.rpc("admin_set_fulfilment", {
      target_order_id: value.orderId,
      new_status: value.status,
      ...(value.carrier ? { selected_carrier: value.carrier } : {}),
      ...(value.trackingNumber
        ? { selected_tracking_number: value.trackingNumber }
        : {}),
      ...(value.trackingUrl
        ? { selected_tracking_url: value.trackingUrl }
        : {}),
    });
    if (error) throw error;
    let emailNote = "";
    if (value.status === "SHIPPED") {
      try {
        const result = await deliverShippingEmail(value.orderId);
        emailNote =
          result.status === "SENT"
            ? " The shipping email was sent."
            : " The shipping email is queued until email is enabled.";
      } catch {
        emailNote = " Shipping was saved, but the email needs retrying.";
      }
    }
    refresh();
    return { ok: true, message: `Fulfilment updated.${emailNote}` };
  } catch (error) {
    const result = mutationError(error, "set_fulfilment");
    return { ok: false, message: result.message };
  }
}

export async function addOrderNoteAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  try {
    const value = orderNoteSchema.parse(input(formData));
    const { client } = await requireAdmin();
    const { error } = await client.rpc("admin_add_order_note", {
      target_order_id: value.orderId,
      note_text: value.note,
    });
    if (error) throw error;
    refresh();
    return { ok: true, message: "Internal note added." };
  } catch (error) {
    const result = mutationError(error, "add_order_note");
    return { ok: false, message: result.message };
  }
}

function stripeReason(
  reason: "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | "OTHER",
): Stripe.RefundCreateParams.Reason | undefined {
  if (reason === "REQUESTED_BY_CUSTOMER") return "requested_by_customer";
  if (reason === "DUPLICATE") return "duplicate";
  if (reason === "FRAUDULENT") return "fraudulent";
  return undefined;
}

export async function createRefundAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  let localRefundId: string | null = null;
  try {
    if (!getServerEnv().REFUNDS_ENABLED)
      return {
        ok: false,
        message:
          "Refunds are disabled until the Stripe refund webhook is configured.",
      };
    const value = refundInputSchema.parse(input(formData));
    if (value.confirmation !== value.orderNumber)
      return { ok: false, message: "Enter the exact order number to confirm." };
    const { client } = await requireAdmin();
    const { data: order, error: orderError } = await client
      .from("orders")
      .select("id,order_number,currency")
      .eq("id", value.orderId)
      .single();
    if (orderError) throw orderError;
    if (order.order_number !== value.orderNumber)
      throw new Error("Order confirmation does not match.");
    const { data: payment, error: paymentError } = await client
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("order_id", value.orderId)
      .single();
    if (paymentError) throw paymentError;
    if (!payment.stripe_payment_intent_id)
      throw new Error("The order has no Stripe PaymentIntent.");
    const { data: refundId, error: prepareError } = await client.rpc(
      "admin_prepare_refund",
      {
        target_order_id: value.orderId,
        refund_request_key: value.requestKey,
        refund_amount: String(value.amount),
        refund_reason: value.reason,
        ...(value.note ? { refund_note: value.note } : {}),
      },
    );
    if (prepareError) throw prepareError;
    localRefundId = refundId;
    const refund = await getStripe().refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id,
        amount: value.amount,
        reason: stripeReason(value.reason),
        metadata: {
          order_id: value.orderId,
          order_number: order.order_number,
          refund_id: refundId,
        },
      },
      { idempotencyKey: `macmaer:refund:${refundId}` },
    );
    const service = createServiceSupabaseClient();
    const { error: providerError } = await service.rpc(
      "checkout_set_refund_provider",
      {
        target_refund_id: refundId,
        provider_refund_id: refund.id,
        current_provider_status: refund.status ?? "pending",
      },
    );
    if (providerError) throw providerError;
    refresh();
    return {
      ok: true,
      message:
        "Refund submitted to Stripe. Its status will update after the webhook confirms it.",
    };
  } catch (error) {
    if (localRefundId) {
      const service = createServiceSupabaseClient();
      await service.rpc("checkout_fail_refund_request", {
        target_refund_id: localRefundId,
        failure_reason:
          error instanceof Error ? error.message : "Stripe refund failed",
      });
    }
    const result = mutationError(error, "create_refund");
    return { ok: false, message: result.message };
  }
}

export async function resendOrderEmailAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  try {
    const value = resendEmailSchema.parse(input(formData));
    await requireAdmin();
    if (value.kind === "ORDER_CONFIRMATION")
      await deliverOrderConfirmationEmail(value.orderId, true);
    else if (value.kind === "SHIPPING_CONFIRMATION")
      await deliverShippingEmail(value.orderId, true);
    else {
      if (!value.refundId)
        return { ok: false, message: "Choose a completed refund." };
      await deliverRefundEmail(value.refundId, true);
    }
    refresh();
    return { ok: true, message: "Email delivery requested." };
  } catch (error) {
    const result = mutationError(error, "resend_order_email");
    return { ok: false, message: result.message };
  }
}
