import { randomBytes, randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { getServerEnv } from "@/lib/env/server";
import { getCart } from "@/modules/cart/repository";
import { countries } from "@/modules/country/countries";
import { getStorefrontContext } from "@/modules/currency/repository";
import { quoteCart } from "@/modules/quote/repository";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [cart, context] = await Promise.all([
    getCart(),
    getStorefrontContext(),
  ]);
  if (!cart.id || !cart.lines.length)
    return (
      <Container className="page-section empty-state">
        <h1>Your cart is empty.</h1>
        <Link href="/shop" className="button">
          Explore all pieces
        </Link>
      </Container>
    );
  const quote = await quoteCart(cart);
  const env = getServerEnv();
  if (!env.CHECKOUT_ENABLED || !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    return (
      <Container className="page-section empty-state">
        <p className="eyebrow">Checkout</p>
        <h1>Ordering is not open yet.</h1>
        <p>Your cart is saved. Please return when checkout has been enabled.</p>
        <Link href="/cart" className="button">
          Return to cart
        </Link>
      </Container>
    );
  if (!quote.destinationSupported || !quote.shipping)
    return (
      <Container className="page-section empty-state">
        <h1>Shipping needs your attention.</h1>
        <p>Return to your cart and choose a supported destination.</p>
        <Link href="/cart" className="button">
          Return to cart
        </Link>
      </Container>
    );
  const supported = countries.filter((country) =>
    context.supportedCountries.includes(country.code),
  );
  return (
    <Container className="page-section checkout-page">
      <div className="page-intro">
        <p className="eyebrow">Secure checkout</p>
        <h1>Delivery, then payment.</h1>
        <p>
          We recalculate every price, discount, shipping charge and VAT amount
          on the server before your payment begins.
        </p>
      </div>
      <CheckoutClient
        cartId={cart.id}
        countries={supported}
        initialCountry={cart.destinationCountry}
        initialSummary={{
          currency: quote.currency,
          merchandiseAmount: quote.merchandiseAmount,
          discountAmount: quote.discountAmount,
          shippingAmount: quote.shippingGrossAmount,
          netAmount: quote.netAmount,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          taxMessage: quote.taxMessage,
          shippingMethod: quote.shipping.methodName,
        }}
        publishableKey={env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        initialAttemptId={randomUUID()}
        initialAccessToken={randomBytes(32).toString("base64url")}
      />
    </Container>
  );
}
