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
  CheckoutDisplayItem,
} from "@/modules/checkout/schema";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";
import { countryFlag } from "@/modules/country/flag";

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
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  return (
    <div className="address-fields">
      <label className="field-wide">
        {sv ? "Fullständigt namn" : "Full name"}
        <input name={`${prefix}.name`} autoComplete="name" required />
      </label>
      <label className="field-wide">
        {sv ? "Adress" : "Address"}
        <input name={`${prefix}.line1`} autoComplete="address-line1" required />
      </label>
      <label className="field-wide">
        {sv ? "Lägenhet, våning etc." : "Apartment, suite, etc."}{" "}
        <span>({sv ? "valfritt" : "optional"})</span>
        <input name={`${prefix}.line2`} autoComplete="address-line2" />
      </label>
      <label>
        {sv ? "Postnummer" : "Postal code"}
        <input
          name={`${prefix}.postalCode`}
          autoComplete="postal-code"
          required
        />
      </label>
      <label>
        {sv ? "Ort" : "City"}
        <input name={`${prefix}.city`} autoComplete="address-level2" required />
      </label>
      <label>
        {sv ? "Region/län" : "Region/state"}{" "}
        <span>({sv ? "valfritt" : "optional"})</span>
        <input name={`${prefix}.region`} autoComplete="address-level1" />
      </label>
      <div>
        <label htmlFor={`${prefix}-country`}>{sv ? "Land" : "Country"}</label>
        <StorefrontSelect
          id={`${prefix}-country`}
          name={`${prefix}.country`}
          value={onCountryChange ? country : undefined}
          defaultValue={country}
          required
          options={countries.map((item) => ({
            value: item.code,
            label: item.name,
            leading: countryFlag(item.code),
          }))}
          onValueChange={onCountryChange}
        />
      </div>
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
  items,
}: {
  cartId: string;
  countries: CountryOption[];
  initialCountry: string;
  initialSummary: Summary;
  publishableKey: string;
  initialAttemptId: string;
  initialAccessToken: string;
  items: CheckoutDisplayItem[];
}) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const [country, setCountry] = useState(initialCountry);
  const [summary, setSummary] = useState(initialSummary);
  const [quoteError, setQuoteError] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [checkout, setCheckout] = useState<CreateCheckoutResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 9_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
        "error" in data
          ? data.error
          : sv
            ? "Det leveranslandet är inte tillgängligt."
            : "That destination is unavailable.",
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
        "error" in data
          ? data.error
          : sv
            ? "Kassan kunde inte startas."
            : "Checkout could not be started.",
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
    setNotice(
      sv && data.notice
        ? /already enjoyed/i.test(data.notice)
          ? "Det verkar som att du redan har använt den här rabatten. Vi tog bort koden så att du kan fortsätta."
          : "Rabatten är inte längre tillgänglig. Vi tog bort koden så att du kan fortsätta till betalning."
        : (data.notice ?? ""),
    );
    setSubmitting(false);
  }

  return (
    <div className="checkout-layout">
      <div>
        {!checkout ? (
          <form className="checkout-form" onSubmit={submitDetails}>
            <section>
              <p className="eyebrow">{sv ? "Kontakt" : "Contact"}</p>
              <h2>{sv ? "Hur når vi dig?" : "Where should we reach you?"}</h2>
              <div className="address-fields">
                <label>
                  {sv ? "E-post" : "Email"}
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  {sv ? "Telefon" : "Telephone"}
                  <input type="tel" name="phone" autoComplete="tel" required />
                </label>
              </div>
              <p className="small muted">
                {sv
                  ? "Båda behövs för leveransuppdateringar, transportörens kontakt och rabattkontroll."
                  : "Both are required for delivery updates, courier contact, and discount eligibility."}
              </p>
            </section>
            <section>
              <p className="eyebrow">{sv ? "Leverans" : "Delivery"}</p>
              <h2>{sv ? "Leveransadress" : "Shipping address"}</h2>
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
                {sv
                  ? "Faktureringsadressen är samma som leveransadressen"
                  : "Billing address is the same as shipping"}
              </label>
              {!billingSame && (
                <>
                  <h3>{sv ? "Faktureringsadress" : "Billing address"}</h3>
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
                  {sv
                    ? "Genom att fortsätta godkänner du "
                    : "By continuing, you agree to the "}
                  <Link href="/terms" target="_blank">
                    {sv ? "köpvillkoren" : "Terms of Sale"}
                  </Link>{" "}
                  {sv
                    ? "och bekräftar att du har tagit del av "
                    : "and acknowledge the "}
                  <Link href="/returns" target="_blank">
                    {sv
                      ? "retur- och ångervillkoren"
                      : "Returns/Withdrawal Policy"}
                  </Link>{" "}
                  {sv ? "samt " : "and "}
                  <Link href="/privacy" target="_blank">
                    {sv ? "integritetspolicyn" : "Privacy Policy"}
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
                  ? sv
                    ? "Säkrar din beställning…"
                    : "Securing your order…"
                  : sv
                    ? "Fortsätt till säker betalning"
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
                variables: {
                  colorPrimary: "#555c47",
                  colorBackground: "#f8f6f2",
                  colorText: "#302e29",
                  borderRadius: "0px",
                },
              },
              locale,
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
        <CheckoutSummary summary={summary} items={items} />
      </div>
      {notice && (
        <div className="checkout-toast" role="status">
          <span aria-hidden="true">✓</span>
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label={sv ? "Stäng meddelandet" : "Dismiss notification"}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
