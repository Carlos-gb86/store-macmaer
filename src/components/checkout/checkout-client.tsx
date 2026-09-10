"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CheckoutSummary } from "./checkout-summary";
import { PaymentForm } from "./payment-form";
import type {
  CheckoutSummary as Summary,
  CreateCheckoutResult,
} from "@/modules/checkout/schema";

type CountryOption = { code: string; name: string };

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

function AddressFields({
  prefix,
  country,
  countries,
  onCountryChange,
}: {
  prefix: string;
  country: string;
  countries: CountryOption[];
  onCountryChange?: (country: string) => void;
}) {
  return (
    <div className="address-fields">
      <label className="field-wide">
        Full name
        <input name={`${prefix}.name`} autoComplete="name" required />
      </label>
      <label className="field-wide">
        Address
        <input name={`${prefix}.line1`} autoComplete="address-line1" required />
      </label>
      <label className="field-wide">
        Apartment, suite, etc. <span>(optional)</span>
        <input name={`${prefix}.line2`} autoComplete="address-line2" />
      </label>
      <label>
        Postal code
        <input
          name={`${prefix}.postalCode`}
          autoComplete="postal-code"
          required
        />
      </label>
      <label>
        City
        <input name={`${prefix}.city`} autoComplete="address-level2" required />
      </label>
      <label>
        Region/state <span>(optional)</span>
        <input name={`${prefix}.region`} autoComplete="address-level1" />
      </label>
      <label>
        Country
        <select
          name={`${prefix}.country`}
          {...(onCountryChange
            ? {
                value: country,
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                  onCountryChange(event.target.value),
              }
            : { defaultValue: country })}
          autoComplete="country"
          required
        >
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function CheckoutClient({
  cartId,
  countries,
  initialCountry,
  initialSummary,
  publishableKey,
  initialAttemptId,
  initialAccessToken,
}: {
  cartId: string;
  countries: CountryOption[];
  initialCountry: string;
  initialSummary: Summary;
  publishableKey: string;
  initialAttemptId: string;
  initialAccessToken: string;
}) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const [country, setCountry] = useState(initialCountry);
  const [summary, setSummary] = useState(initialSummary);
  const [quoteError, setQuoteError] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [checkout, setCheckout] = useState<CreateCheckoutResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const credentials = useRef({
    checkoutAttemptId: initialAttemptId,
    accessToken: initialAccessToken,
  });

  useEffect(() => {
    const key = `macmaer-checkout:${cartId}`;
    const saved = window.sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as typeof credentials.current;
        if (parsed.checkoutAttemptId && parsed.accessToken)
          credentials.current = parsed;
      } catch {
        window.sessionStorage.removeItem(key);
      }
    } else
      window.sessionStorage.setItem(key, JSON.stringify(credentials.current));
  }, [cartId, initialAccessToken, initialAttemptId]);

  async function changeCountry(nextCountry: string) {
    setCountry(nextCountry);
    setQuoteError("");
    const response = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ country: nextCountry }),
    });
    const data = (await response.json()) as Summary | { error: string };
    if (!response.ok || "error" in data) {
      setQuoteError(
        "error" in data ? data.error : "That destination is unavailable.",
      );
      return;
    }
    setSummary(data);
  }

  async function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || quoteError) return;
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const address = (prefix: string) => ({
      name: field(form, `${prefix}.name`),
      line1: field(form, `${prefix}.line1`),
      line2: field(form, `${prefix}.line2`),
      postalCode: field(form, `${prefix}.postalCode`),
      city: field(form, `${prefix}.city`),
      region: field(form, `${prefix}.region`),
      country: field(form, `${prefix}.country`),
    });
    const payload = {
      ...credentials.current,
      email: field(form, "email"),
      phone: field(form, "phone"),
      shippingAddress: address("shipping"),
      billingSameAsShipping: billingSame,
      billingAddress: billingSame ? null : address("billing"),
      acceptTerms: form.get("acceptTerms") === "on",
    };
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as
      CreateCheckoutResult | { error: string };
    if (!response.ok || "error" in data) {
      setMessage(
        "error" in data ? data.error : "Checkout could not be started.",
      );
      if (response.status === 409) {
        const next = {
          checkoutAttemptId: crypto.randomUUID(),
          accessToken: `${crypto.randomUUID()}${crypto.randomUUID()}`,
        };
        credentials.current = next;
        window.sessionStorage.setItem(
          `macmaer-checkout:${cartId}`,
          JSON.stringify(next),
        );
      }
      setSubmitting(false);
      return;
    }
    setCheckout(data);
    setSummary(data.summary);
    setSubmitting(false);
  }

  return (
    <div className="checkout-layout">
      <div>
        {!checkout ? (
          <form className="checkout-form" onSubmit={submitDetails}>
            <section>
              <p className="eyebrow">Contact</p>
              <h2>Where should we reach you?</h2>
              <div className="address-fields">
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Telephone
                  <input type="tel" name="phone" autoComplete="tel" required />
                </label>
              </div>
              <p className="small muted">
                Both are required for delivery updates, courier contact, and
                discount eligibility.
              </p>
            </section>
            <section>
              <p className="eyebrow">Delivery</p>
              <h2>Shipping address</h2>
              <AddressFields
                prefix="shipping"
                country={country}
                countries={countries}
                onCountryChange={changeCountry}
              />
              <label className="checkout-check">
                <input
                  type="checkbox"
                  checked={billingSame}
                  onChange={(event) => setBillingSame(event.target.checked)}
                />
                Billing address is the same as shipping
              </label>
              {!billingSame && (
                <>
                  <h3>Billing address</h3>
                  <AddressFields
                    prefix="billing"
                    country={country}
                    countries={countries}
                  />
                </>
              )}
            </section>
            <section>
              <label className="checkout-check checkout-terms">
                <input type="checkbox" name="acceptTerms" required />
                <span>
                  By continuing, you agree to the{" "}
                  <Link href="/terms" target="_blank">
                    Terms of Sale
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/returns" target="_blank">
                    Returns/Withdrawal Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {message && (
                <p className="cart-error" role="alert">
                  {message}
                </p>
              )}
              <button
                className="button"
                disabled={submitting || Boolean(quoteError)}
              >
                {submitting
                  ? "Securing your order…"
                  : "Continue to secure payment"}
              </button>
            </section>
          </form>
        ) : (
          <Elements
            stripe={stripe}
            options={{
              clientSecret: checkout.clientSecret,
              appearance: {
                theme: "stripe",
                variables: { colorPrimary: "#555c47", borderRadius: "0px" },
              },
            }}
          >
            <PaymentForm
              orderId={checkout.orderId}
              orderNumber={checkout.orderNumber}
            />
          </Elements>
        )}
      </div>
      <div>
        {quoteError && (
          <p className="cart-error" role="alert">
            {quoteError}
          </p>
        )}
        <CheckoutSummary summary={summary} />
      </div>
    </div>
  );
}
