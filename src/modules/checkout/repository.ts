import "server-only";
import { createHash, createHmac } from "node:crypto";
import type Stripe from "stripe";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import { getServerEnv } from "@/lib/env/server";
import { getCart, setCartDiscountCode } from "@/modules/cart/repository";
import {
  getStrictStorefrontContext,
  type StorefrontContext,
} from "@/modules/currency/repository";
import { currencySchema } from "@/modules/currency/schema";
import { getQuoteConfiguration, quoteCart } from "@/modules/quote/repository";
import { getStripe, usesLiveStripe } from "@/modules/payments/stripe";
import { buildOrderItemSnapshots } from "./snapshot";
import {
  CheckoutError,
  createCheckoutSchema,
  type CheckoutAddress,
  type CheckoutSummary,
  type CreateCheckoutResult,
} from "./schema";

const RESERVATION_MINUTES = 30;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function identityHash(value: string) {
  const secret = getServerEnv().CUSTOMER_IDENTITY_HASH_SECRET;
  if (!secret)
    throw new CheckoutError(
      "Checkout identity protection is not configured.",
      503,
    );
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function normalizeEmail(value: string) {
  return value.trim().normalize("NFKC").toLowerCase();
}

export function normalizePhone(value: string) {
  const normalized = value.trim().replace(/[^\d+]/g, "");
  return (
    (normalized.startsWith("+") ? "+" : "") + normalized.replace(/\D/g, "")
  );
}

export function discountRemovalNotice(
  message: string,
  customerSpecific = false,
) {
  if (customerSpecific || /already used/i.test(message))
    return "It looks like you’ve already enjoyed this discount. We removed the code so you can continue.";
  return "That discount is no longer available, so we removed it and kept your checkout moving.";
}

function stripeAddress(address: CheckoutAddress): Stripe.AddressParam {
  return {
    line1: address.line1,
    ...(address.line2 ? { line2: address.line2 } : {}),
    postal_code: address.postalCode,
    city: address.city,
    ...(address.region ? { state: address.region } : {}),
    country: address.country,
  };
}

function summary(
  quote: Awaited<ReturnType<typeof quoteCart>>,
): CheckoutSummary {
  return {
    currency: quote.currency,
    merchandiseAmount: quote.merchandiseAmount,
    discountAmount: quote.discountAmount,
    shippingAmount: quote.shippingGrossAmount,
    netAmount: quote.netAmount,
    taxAmount: quote.taxAmount,
    totalAmount: quote.totalAmount,
    taxMessage: quote.taxMessage,
    shippingMethod: quote.shipping?.methodName ?? "",
  };
}

export async function quoteCheckout(country: string) {
  const cart = await getCart();
  if (!cart.id || !cart.lines.length)
    throw new CheckoutError("Your cart is empty.");
  const quote = await quoteCart({ ...cart, destinationCountry: country });
  if (!quote.destinationSupported || !quote.shipping)
    throw new CheckoutError("We cannot ship this cart to that destination.");
  return summary(quote);
}

async function policyVersions() {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("policy_versions")
    .select("id,policy_type,version,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const result: Record<string, { id: string; version: string }> = {};
  for (const policy of data)
    if (!result[policy.policy_type])
      result[policy.policy_type] = { id: policy.id, version: policy.version };
  for (const type of ["TERMS", "PRIVACY", "SHIPPING", "RETURNS", "CUSTOMS"])
    if (!result[type])
      throw new CheckoutError("Store policies are not configured.", 503);
  return result;
}

async function existingPaymentIntent(orderId: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("order_id", orderId)
    .single();
  if (error) throw error;
  if (!data.stripe_payment_intent_id) return null;
  const intent = await getStripe().paymentIntents.retrieve(
    data.stripe_payment_intent_id,
  );
  if (!intent.client_secret)
    throw new CheckoutError("The payment session could not be resumed.", 409);
  return intent;
}

async function releaseExpiredOrders() {
  const client = createServiceSupabaseClient();
  const { data: expired, error } = await client
    .from("orders")
    .select("id")
    .eq("status", "PENDING_PAYMENT")
    .lt("reservation_expires_at", new Date().toISOString())
    .limit(20);
  if (error) throw error;
  for (const order of expired) {
    const { data: payment, error: paymentError } = await client
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("order_id", order.id)
      .single();
    if (paymentError) continue;
    try {
      if (payment.stripe_payment_intent_id) {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
        );
        if (intent.status === "succeeded" || intent.status === "processing")
          continue;
        if (intent.status !== "canceled")
          await stripe.paymentIntents.cancel(intent.id, undefined, {
            idempotencyKey: `macmaer:${order.id}:expire`,
          });
      }
      const { error: cancelError } = await client.rpc("checkout_cancel_order", {
        target_order_id: order.id,
        reason: "Checkout reservation expired",
      });
      if (cancelError) throw cancelError;
    } catch {
      // A concurrent Stripe state change wins; its webhook reconciles the order.
    }
  }
}

export async function createCheckout(
  input: unknown,
): Promise<CreateCheckoutResult & { accessToken: string }> {
  return createCheckoutAttempt(input, null);
}

async function createCheckoutAttempt(
  input: unknown,
  discountNotice: string | null,
): Promise<CreateCheckoutResult & { accessToken: string }> {
  const env = getServerEnv();
  if (!env.CHECKOUT_ENABLED)
    throw new CheckoutError("Checkout is not open yet.", 503);
  const value = createCheckoutSchema.parse(input);
  await releaseExpiredOrders();
  let storefrontContext: StorefrontContext;
  try {
    storefrontContext = await getStrictStorefrontContext();
  } catch {
    throw new CheckoutError(
      "Prices could not be verified right now. Please try checkout again in a moment.",
      503,
    );
  }
  const cart = await getCart(storefrontContext);
  if (!cart.id || !cart.lines.length)
    throw new CheckoutError("Your cart is empty.");
  if (cart.lines.some((line) => !line.valid))
    throw new CheckoutError(
      "Review unavailable items in your cart before checkout.",
    );
  const [configuration, versions] = await Promise.all([
    getQuoteConfiguration(),
    policyVersions(),
  ]);
  const { pricing } = storefrontContext;
  const checkoutCart = {
    ...cart,
    destinationCountry: value.shippingAddress.country,
  };
  const quote = await quoteCart(
    checkoutCart,
    checkoutCart.discountCode,
    pricing,
  );
  if (!quote.destinationSupported || !quote.shipping)
    throw new CheckoutError("We cannot ship this cart to that destination.");
  if (quote.discountMessage) {
    if (cart.discountCode && !discountNotice) {
      await setCartDiscountCode(null);
      return createCheckoutAttempt(
        value,
        discountRemovalNotice(quote.discountMessage),
      );
    }
    throw new CheckoutError(quote.discountMessage);
  }
  if (usesLiveStripe() && quote.taxReviewRequired)
    throw new CheckoutError(
      "Checkout is waiting for the production VAT review.",
      503,
    );
  const discount = quote.discountCode
    ? (configuration.discounts.find(
        (item) => item.code === quote.discountCode,
      ) ?? null)
    : null;
  const items = buildOrderItemSnapshots({
    lines: cart.lines,
    quote,
    configuration,
    discount,
  });
  const email = normalizeEmail(value.email);
  const phone = normalizePhone(value.phone);
  const acceptedAt = new Date();
  const expiresAt = new Date(
    acceptedAt.getTime() + RESERVATION_MINUTES * 60_000,
  );
  const document = {
    checkout_attempt_id: value.checkoutAttemptId,
    access_token_hash: sha256(value.accessToken),
    cart_id: cart.id,
    currency: quote.currency,
    customer_name: value.shippingAddress.name,
    customer_email: email,
    customer_phone: value.phone.trim(),
    email_identity_hash: identityHash(email),
    phone_identity_hash: identityHash(phone),
    shipping_address: value.shippingAddress,
    billing_address: value.billingSameAsShipping
      ? value.shippingAddress
      : value.billingAddress,
    destination_country: value.shippingAddress.country,
    shipping_method_snapshot: quote.shipping,
    policy_version_ids: versions,
    merchandise_amount: quote.merchandiseAmount,
    discount_amount: quote.discountAmount,
    merchandise_net_amount: quote.merchandiseNetAmount,
    merchandise_tax_amount: quote.merchandiseTaxAmount,
    shipping_net_amount: quote.shippingNetAmount,
    shipping_tax_amount: quote.shippingTaxAmount,
    shipping_gross_amount: quote.shippingGrossAmount,
    net_amount: quote.netAmount,
    tax_amount: quote.taxAmount,
    total_amount: quote.totalAmount,
    discount_id: discount?.id ?? null,
    discount_code: discount?.code ?? null,
    discount_name: discount?.name ?? null,
    fx_rate_id: pricing.rate?.id ?? null,
    tax_rule_ids: quote.taxRuleIds,
    tax_rates_basis_points: quote.taxRates,
    tax_message: quote.taxMessage,
    terms_accepted_at: acceptedAt.toISOString(),
    reservation_expires_at: expiresAt.toISOString(),
    items,
  };
  const client = createServiceSupabaseClient();
  const { data: orderId, error: createError } = await client.rpc(
    "checkout_create_order",
    { document: document as unknown as Json },
  );
  if (createError) {
    if (/already used/i.test(createError.message)) {
      if (cart.discountCode && !discountNotice) {
        await setCartDiscountCode(null);
        return createCheckoutAttempt(
          value,
          discountRemovalNotice(createError.message, true),
        );
      }
      throw new CheckoutError("This discount has already been used.");
    }
    if (/usage limit/i.test(createError.message)) {
      if (cart.discountCode && !discountNotice) {
        await setCartDiscountCode(null);
        return createCheckoutAttempt(
          value,
          discountRemovalNotice(createError.message),
        );
      }
      throw new CheckoutError("This discount is no longer available.");
    }
    if (/inventory/i.test(createError.message))
      throw new CheckoutError(
        "One of these pieces is no longer available in the requested quantity.",
      );
    throw createError;
  }
  const { data: order, error: orderError } = await client
    .from("orders")
    .select(
      "id,order_number,status,total_amount,currency,reservation_expires_at",
    )
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;
  if (
    order.status === "CANCELLED" ||
    new Date(order.reservation_expires_at) <= new Date()
  )
    throw new CheckoutError(
      "This checkout session has expired. Return to your cart and try again.",
      409,
    );
  let intent = await existingPaymentIntent(order.id);
  if (!intent) {
    intent = await getStripe().paymentIntents.create(
      {
        amount: order.total_amount,
        currency: order.currency.toLowerCase(),
        payment_method_types: ["card"],
        receipt_email: email,
        description: `Macmaer order ${order.order_number}`,
        metadata: { order_id: order.id, order_number: order.order_number },
        shipping: {
          name: value.shippingAddress.name,
          phone: value.phone.trim(),
          address: stripeAddress(value.shippingAddress),
        },
      },
      { idempotencyKey: `macmaer:${order.id}:payment:1` },
    );
    const { error } = await client.rpc("checkout_set_payment_intent", {
      target_order_id: order.id,
      payment_intent_id: intent.id,
    });
    if (error) throw error;
  }
  if (!intent.client_secret)
    throw new CheckoutError(
      "Stripe did not create a usable payment session.",
      502,
    );
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    clientSecret: intent.client_secret,
    accessToken: value.accessToken,
    summary: summary(quote),
    ...(discountNotice ? { notice: discountNotice } : {}),
  };
}

export async function readOrderStatus(orderId: string, accessToken: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("orders")
    .select(
      "id,order_number,status,payment_status,currency,total_amount,customer_email,created_at",
    )
    .eq("id", orderId)
    .eq("access_token_hash", sha256(accessToken))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new CheckoutError("Order not found.", 404);
  return { ...data, currency: currencySchema.parse(data.currency) };
}

export async function processStripePaymentEvent(event: Stripe.Event) {
  const intent = event.data.object as Stripe.PaymentIntent;
  const orderId = intent.metadata.order_id;
  if (!orderId)
    throw new Error("Stripe PaymentIntent is missing order metadata.");
  const client = createServiceSupabaseClient();
  const { data: order, error: orderError } = await client
    .from("orders")
    .select("id,total_amount,currency")
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;
  if (
    intent.amount !== order.total_amount ||
    intent.currency.toUpperCase() !== order.currency
  )
    throw new Error(
      "Stripe payment amount or currency does not match the order.",
    );
  if (
    event.type === "payment_intent.succeeded" &&
    intent.amount_received !== order.total_amount
  )
    throw new Error("Stripe has not received the full order amount.");
  const providerError = intent.last_payment_error?.message ?? null;
  const { data, error } = await client.rpc("checkout_process_stripe_event", {
    stripe_event_id: event.id,
    stripe_event_type: event.type,
    stripe_object_id: intent.id,
    target_order_id: order.id,
    ...(providerError ? { provider_error: providerError } : {}),
  });
  if (error) throw error;
  return data;
}

export async function processStripeRefundEvent(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund;
  const orderId = refund.metadata?.order_id;
  const refundId = refund.metadata?.refund_id;
  if (!orderId || !refundId)
    throw new Error("Stripe refund is missing Macmaer metadata.");
  const client = createServiceSupabaseClient();
  const [refundResult, paymentResult] = await Promise.all([
    client
      .from("refunds")
      .select("id,order_id,amount,currency")
      .eq("id", refundId)
      .eq("order_id", orderId)
      .single(),
    client
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("order_id", orderId)
      .single(),
  ]);
  if (refundResult.error) throw refundResult.error;
  if (paymentResult.error) throw paymentResult.error;
  const localRefund = refundResult.data;
  if (
    localRefund.amount !== refund.amount ||
    localRefund.currency !== refund.currency.toUpperCase()
  )
    throw new Error("Stripe refund amount or currency does not match.");
  const paymentIntentId =
    typeof refund.payment_intent === "string"
      ? refund.payment_intent
      : refund.payment_intent?.id;
  if (
    !paymentIntentId ||
    paymentIntentId !== paymentResult.data.stripe_payment_intent_id
  )
    throw new Error("Stripe refund does not match the order payment.");
  const { data, error: processError } = await client.rpc(
    "checkout_process_refund_event",
    {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      provider_refund_id: refund.id,
      target_order_id: orderId,
      target_refund_id: refundId,
      current_provider_status: refund.status ?? "pending",
      ...(refund.failure_reason
        ? { failure_reason: refund.failure_reason }
        : {}),
    },
  );
  if (processError) throw processError;
  return { result: data, refundId, status: refund.status };
}
