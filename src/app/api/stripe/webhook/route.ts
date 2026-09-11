import Stripe from "stripe";
import { getServerEnv } from "@/lib/env/server";
import { getStripe } from "@/modules/payments/stripe";
import { processStripePaymentEvent } from "@/modules/checkout/repository";

export const runtime = "nodejs";

const paymentEvents = new Set<Stripe.Event.Type>([
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

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
  if (!paymentEvents.has(event.type))
    return Response.json({ received: true, result: "IGNORED" });
  const intent = event.data.object as Stripe.PaymentIntent;
  if (!intent.metadata.order_id)
    return Response.json({ received: true, result: "IGNORED" });
  try {
    const result = await processStripePaymentEvent(event);
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
