import Stripe from "stripe";
import { getServerEnv } from "@/lib/env/server";
import { getStripe } from "@/modules/payments/stripe";
import {
  processStripePaymentEvent,
  processStripeRefundEvent,
} from "@/modules/checkout/repository";
import {
  deliverPaidOrderEmails,
  deliverRefundEmail,
} from "@/modules/email/service";

export const runtime = "nodejs";

const paymentEvents = new Set<Stripe.Event.Type>([
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);
const refundEvents = new Set<Stripe.Event.Type>([
  "refund.created",
  "refund.updated",
  "refund.failed",
]);

async function attemptEmail(label: string, operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    console.error(`${label} email delivery failed`, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return new Response("Webhook is not configured.", { status: 503 });
  if (!signature)
    return new Response("Stripe signature is required.", { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return new Response("Invalid Stripe signature.", { status: 400 });
  }
  if (!paymentEvents.has(event.type) && !refundEvents.has(event.type))
    return Response.json({ received: true, result: "IGNORED" });
  try {
    if (refundEvents.has(event.type)) {
      const refund = event.data.object as Stripe.Refund;
      if (!refund.metadata?.order_id || !refund.metadata.refund_id)
        return Response.json({ received: true, result: "IGNORED" });
      const processed = await processStripeRefundEvent(event);
      if (processed.status === "succeeded")
        await attemptEmail("Refund", () =>
          deliverRefundEmail(processed.refundId),
        );
      return Response.json({ received: true, result: processed.result });
    }
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata.order_id;
    if (!orderId) return Response.json({ received: true, result: "IGNORED" });
    const result = await processStripePaymentEvent(event);
    if (event.type === "payment_intent.succeeded")
      await attemptEmail("Paid order", () => deliverPaidOrderEmails(orderId));
    return Response.json({ received: true, result });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response("Webhook processing failed.", { status: 500 });
  }
}
