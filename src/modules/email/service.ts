import "server-only";

import { randomUUID } from "node:crypto";
import { getServerEnv } from "@/lib/env/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  adminOrderTemplate,
  contactAcknowledgementTemplate,
  contactNotificationTemplate,
  orderConfirmationTemplate,
  refundTemplate,
  shippingTemplate,
  type EmailOrder,
} from "./templates";

const ORDER_ADDRESS = "Macmaer <info@macmaer.com>";
const CONTACT_ADDRESS = "Macmaer <contact@macmaer.com>";
const ORDER_RECIPIENT = "info@macmaer.com";
const CONTACT_RECIPIENT = "contact@macmaer.com";

type EmailKind = Database["public"]["Enums"]["email_kind"];
type Template = { subject: string; html: string; text: string };

type TrackedEmail = Template & {
  kind: EmailKind;
  recipient: string;
  from: string;
  replyTo: string;
  idempotencyKey: string;
  orderId?: string;
  contactMessageId?: string;
};

function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : "Email delivery failed.";
}

async function sendTrackedEmail(message: TrackedEmail) {
  const client = createServiceSupabaseClient();
  const { data: existing, error: readError } = await client
    .from("email_deliveries")
    .select("id,status,attempt_count")
    .eq("idempotency_key", message.idempotencyKey)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.status === "SENT") return { status: "SENT" as const };

  let delivery = existing;
  if (!delivery) {
    const { data, error } = await client
      .from("email_deliveries")
      .insert({
        order_id: message.orderId ?? null,
        contact_message_id: message.contactMessageId ?? null,
        kind: message.kind,
        recipient_email: message.recipient,
        idempotency_key: message.idempotencyKey,
      })
      .select("id,status,attempt_count")
      .single();
    if (error) throw error;
    delivery = data;
  }

  const env = getServerEnv();
  if (!env.EMAIL_ENABLED || !env.RESEND_API_KEY) {
    await client
      .from("email_deliveries")
      .update({ last_error: "Transactional email is disabled." })
      .eq("id", delivery.id);
    return { status: "PENDING" as const };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.recipient],
        reply_to: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        typeof body === "object" &&
          body &&
          "message" in body &&
          typeof body.message === "string"
          ? body.message
          : `Resend returned ${response.status}.`,
      );
    const providerId =
      typeof body === "object" &&
      body &&
      "id" in body &&
      typeof body.id === "string"
        ? body.id
        : null;
    const { error } = await client
      .from("email_deliveries")
      .update({
        status: "SENT",
        provider_message_id: providerId,
        attempt_count: delivery.attempt_count + 1,
        last_error: null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);
    if (error) throw error;
    return { status: "SENT" as const };
  } catch (error) {
    await client
      .from("email_deliveries")
      .update({
        status: "FAILED",
        attempt_count: delivery.attempt_count + 1,
        last_error: errorMessage(error).slice(0, 500),
      })
      .eq("id", delivery.id);
    throw error;
  }
}

function optionLabels(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
    if (!option || typeof option !== "object" || Array.isArray(option))
      return [];
    const label = typeof option.label === "string" ? option.label : null;
    const values = Array.isArray(option.values)
      ? option.values.flatMap((entry) =>
          entry &&
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          typeof entry.label === "string"
            ? [entry.label]
            : [],
        )
      : [];
    return label && values.length ? [`${label}: ${values.join(", ")}`] : [];
  });
}

async function loadOrder(orderId: string): Promise<EmailOrder> {
  const client = createServiceSupabaseClient();
  const [
    { data: order, error: orderError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    client
      .from("orders")
      .select(
        "order_number,customer_name,customer_email,currency,total_amount,tax_amount,shipping_gross_amount,discount_amount",
      )
      .eq("id", orderId)
      .single(),
    client
      .from("order_items")
      .select("product_title,quantity,gross_amount,selected_options")
      .eq("order_id", orderId)
      .order("created_at"),
  ]);
  if (orderError) throw orderError;
  if (itemsError) throw itemsError;
  return {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    currency: order.currency,
    totalAmount: order.total_amount,
    taxAmount: order.tax_amount,
    shippingGrossAmount: order.shipping_gross_amount,
    discountAmount: order.discount_amount,
    items: items.map((item) => ({
      productTitle: item.product_title,
      quantity: item.quantity,
      grossAmount: item.gross_amount,
      selectedOptions: optionLabels(item.selected_options),
    })),
  };
}

export async function deliverOrderConfirmationEmail(
  orderId: string,
  force = false,
) {
  const order = await loadOrder(orderId);
  const suffix = force ? `:manual:${randomUUID()}` : ":v1";
  const customer = orderConfirmationTemplate(order);
  return sendTrackedEmail({
    ...customer,
    kind: "ORDER_CONFIRMATION",
    recipient: order.customerEmail,
    from: ORDER_ADDRESS,
    replyTo: ORDER_RECIPIENT,
    orderId,
    idempotencyKey: `order:${orderId}:confirmation${suffix}`,
  });
}

async function deliverAdminOrderEmail(orderId: string) {
  const order = await loadOrder(orderId);
  const admin = adminOrderTemplate(order);
  return sendTrackedEmail({
    ...admin,
    kind: "ADMIN_NEW_ORDER",
    recipient: ORDER_RECIPIENT,
    from: ORDER_ADDRESS,
    replyTo: order.customerEmail,
    orderId,
    idempotencyKey: `order:${orderId}:admin:v1`,
  });
}

export async function deliverPaidOrderEmails(orderId: string) {
  return Promise.allSettled([
    deliverOrderConfirmationEmail(orderId),
    deliverAdminOrderEmail(orderId),
  ]);
}

export async function deliverShippingEmail(orderId: string, force = false) {
  const client = createServiceSupabaseClient();
  const [{ data: fulfilment, error }, order] = await Promise.all([
    client
      .from("order_fulfilments")
      .select("carrier,tracking_number,tracking_url")
      .eq("order_id", orderId)
      .single(),
    loadOrder(orderId),
  ]);
  if (error) throw error;
  if (!fulfilment.carrier || !fulfilment.tracking_number)
    throw new Error("Shipping details are incomplete.");
  const template = shippingTemplate(order, {
    carrier: fulfilment.carrier,
    trackingNumber: fulfilment.tracking_number,
    trackingUrl: fulfilment.tracking_url,
  });
  return sendTrackedEmail({
    ...template,
    kind: "SHIPPING_CONFIRMATION",
    recipient: order.customerEmail,
    from: ORDER_ADDRESS,
    replyTo: ORDER_RECIPIENT,
    orderId,
    idempotencyKey: `order:${orderId}:shipping:${fulfilment.tracking_number}${force ? `:manual:${randomUUID()}` : ":v1"}`,
  });
}

export async function deliverRefundEmail(refundId: string, force = false) {
  const client = createServiceSupabaseClient();
  const { data: refund, error } = await client
    .from("refunds")
    .select("id,order_id,amount,status")
    .eq("id", refundId)
    .single();
  if (error) throw error;
  if (refund.status !== "SUCCEEDED")
    throw new Error("The refund is not confirmed.");
  const order = await loadOrder(refund.order_id);
  const template = refundTemplate(order, refund.amount);
  return sendTrackedEmail({
    ...template,
    kind: "REFUND_CONFIRMATION",
    recipient: order.customerEmail,
    from: ORDER_ADDRESS,
    replyTo: ORDER_RECIPIENT,
    orderId: refund.order_id,
    idempotencyKey: `refund:${refund.id}:confirmation${force ? `:manual:${randomUUID()}` : ":v1"}`,
  });
}

export type SavedContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

export async function deliverContactEmails(message: SavedContactMessage) {
  const notification = contactNotificationTemplate(message);
  const acknowledgement = contactAcknowledgementTemplate(message.firstName);
  return Promise.allSettled([
    sendTrackedEmail({
      ...notification,
      kind: "CONTACT_NOTIFICATION",
      recipient: CONTACT_RECIPIENT,
      from: CONTACT_ADDRESS,
      replyTo: message.email,
      contactMessageId: message.id,
      idempotencyKey: `contact:${message.id}:notification:v1`,
    }),
    sendTrackedEmail({
      ...acknowledgement,
      kind: "CONTACT_ACKNOWLEDGEMENT",
      recipient: message.email,
      from: CONTACT_ADDRESS,
      replyTo: CONTACT_RECIPIENT,
      contactMessageId: message.id,
      idempotencyKey: `contact:${message.id}:acknowledgement:v1`,
    }),
  ]);
}
