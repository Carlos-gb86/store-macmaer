import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CartLineControls } from "@/components/cart/cart-line-controls";
import { DiscountCodeForm } from "@/components/cart/discount-code-form";
import { DestinationSelector } from "@/components/currency/destination-selector";
import { getCart } from "@/modules/cart/repository";
import { getStorefrontContext } from "@/modules/currency/repository";
import { quoteCart } from "@/modules/quote/repository";
import { formatMoney } from "@/modules/currency/money";
import { localizedCountries } from "@/modules/country/countries";
import { resolveImage } from "@/modules/media/resolve-image";
import { formatOptions } from "@/modules/cart/format-options";
import { getStorefrontLocale } from "@/modules/i18n/server";
import {
  localizeCommerceMessage,
  localizeShippingLabel,
} from "@/modules/i18n/commerce";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv" ? "Din varukorg" : "Your cart",
  };
}

export default async function CartPage() {
  const [context, locale] = await Promise.all([
    getStorefrontContext(),
    getStorefrontLocale(),
  ]);
  const sv = locale === "sv";
  const cart = await getCart(context);
  const quote = cart.lines.length ? await quoteCart(cart) : null;
  return (
    <Container className="page-section cart-page">
      <div className="page-intro">
        <p className="eyebrow">{sv ? "Dina val" : "Your selections"}</p>
        <h1>{sv ? "Din varukorg." : "Your cart."}</h1>
        <p>
          {sv
            ? "Granska dina produkter och leveransuppskattningen före kassan."
            : "Review your pieces and delivery estimate before checkout."}
        </p>
      </div>
      <div className="cart-preferences">
        <DestinationSelector
          destination={cart.destinationCountry}
          countries={localizedCountries(locale).filter((country) =>
            context.supportedCountries.includes(country.code),
          )}
        />
        <p className="small muted">
          {sv ? "Priser visas i" : "Prices shown in"} {cart.currency}.
        </p>
      </div>
      {!cart.lines.length ? (
        <div className="empty-state">
          <h2>{sv ? "Din varukorg väntar." : "Your cart is waiting."}</h2>
          <p>
            {sv
              ? "Utforska kollektionen och välj något som passar ditt rum."
              : "Explore the collection and choose something made for your space."}
          </p>
          <Link href="/shop" className="button">
            {sv ? "Utforska alla produkter" : "Explore all pieces"}
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {cart.lines.map((line) => (
              <article className="cart-line" key={line.id}>
                <div className="cart-line-image">
                  {line.imagePath ? (
                    <Image
                      src={resolveImage(line.imagePath)}
                      alt=""
                      fill
                      sizes="160px"
                    />
                  ) : (
                    <span>{sv ? "Ingen bild" : "No image"}</span>
                  )}
                </div>
                <div className="cart-line-copy">
                  <Link
                    href={`/products/${line.productSlug}`}
                    className="cart-line-title"
                  >
                    {line.productTitle}
                  </Link>
                  {line.sku && <p className="small muted">SKU {line.sku}</p>}
                  {formatOptions(line.options).map((option, index) => (
                    <p className="cart-option" key={`${index}:${option}`}>
                      {option}
                    </p>
                  ))}
                  {!line.valid && (
                    <p className="cart-line-error" role="alert">
                      {line.message}
                    </p>
                  )}
                  <CartLineControls
                    key={`${line.id}:${line.quantity}`}
                    lineId={line.id}
                    quantity={line.quantity}
                  />
                </div>
                <p className="cart-line-price">
                  {formatMoney(
                    line.displayUnitAmount * line.quantity,
                    line.displayCurrency,
                  )}
                  {line.quantity > 1 && (
                    <span>
                      {formatMoney(
                        line.displayUnitAmount,
                        line.displayCurrency,
                      )}{" "}
                      {sv ? "styck" : "each"}
                    </span>
                  )}
                </p>
              </article>
            ))}
          </div>
          <aside className="cart-summary">
            <h2>{sv ? "Sammanfattning" : "Summary"}</h2>
            <div>
              <span>{sv ? "Produkter" : "Products"}</span>
              <strong>
                {formatMoney(
                  quote?.merchandiseAmount ?? cart.subtotal,
                  cart.currency,
                )}
              </strong>
            </div>
            {quote && quote.discountAmount > 0 && (
              <div className="cart-summary-discount">
                <span>{quote.discountCode}</span>
                <strong>
                  −{formatMoney(quote.discountAmount, cart.currency)}
                </strong>
              </div>
            )}
            {quote?.discountMessage && (
              <p className="cart-error">
                {localizeCommerceMessage(quote.discountMessage, locale)}
              </p>
            )}
            <div>
              <span>{sv ? "Frakt" : "Shipping"}</span>
              <strong>
                {quote?.shipping
                  ? quote.shipping.free
                    ? sv
                      ? "Kostnadsfri"
                      : "Free"
                    : formatMoney(quote.shippingGrossAmount, cart.currency)
                  : sv
                    ? "Inte tillgänglig"
                    : "Unavailable"}
              </strong>
            </div>
            {quote?.shipping && (
              <p className="cart-summary-note">
                {localizeShippingLabel(quote.shipping.methodName, locale)} ·{" "}
                {localizeShippingLabel(quote.shipping.zoneName, locale)}
                {quote.shipping.estimatedDelivery
                  ? ` · ${quote.shipping.estimatedDelivery}`
                  : ""}
              </p>
            )}
            <div>
              <span>{sv ? "Nettobelopp" : "Net amount"}</span>
              <strong>
                {formatMoney(quote?.netAmount ?? cart.subtotal, cart.currency)}
              </strong>
            </div>
            <div>
              <span>
                {sv ? "Moms" : "VAT"}
                {quote?.taxRates.length
                  ? ` (${quote.taxRates.map((rate) => rate / 100 + "%").join(", ")})`
                  : ""}
              </span>
              <strong>
                {formatMoney(quote?.taxAmount ?? 0, cart.currency)}
              </strong>
            </div>
            <div className="cart-summary-total">
              <span>{sv ? "Uppskattat totalbelopp" : "Estimated total"}</span>
              <strong>
                {formatMoney(
                  quote?.totalAmount ?? cart.subtotal,
                  cart.currency,
                )}
              </strong>
            </div>
            <DiscountCodeForm code={cart.discountCode} />
            <p>{localizeCommerceMessage(quote?.taxMessage, locale)}</p>
            {quote && !quote.destinationSupported && (
              <p className="cart-error">
                {sv
                  ? "Vi levererar för närvarande inte till detta land."
                  : "We do not currently ship to this destination."}
              </p>
            )}
            {quote?.destinationSupported && !quote.shipping && (
              <p className="cart-error">
                {sv
                  ? "Ingen fraktkostnad matchar varukorgen. Kontakta Macmaer."
                  : "No shipping rate matches this cart. Please contact Macmaer."}
              </p>
            )}
            <p>
              {sv
                ? "Detta är en uppskattning tills leveransadressen har bekräftats i kassan."
                : "This remains an estimate until the shipping address is confirmed during checkout."}
            </p>
            {quote?.destinationSupported && quote.shipping ? (
              <Link className="button" href="/checkout">
                {sv ? "Fortsätt till kassan" : "Continue to checkout"}
              </Link>
            ) : (
              <button className="button" disabled>
                {sv ? "Kassan är inte tillgänglig" : "Checkout unavailable"}
              </button>
            )}
            <Link href="/shop" className="text-link">
              {sv ? "Fortsätt handla" : "Continue shopping"}
            </Link>
          </aside>
        </div>
      )}
    </Container>
  );
}
