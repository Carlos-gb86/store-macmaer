import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CartLineControls } from "@/components/cart/cart-line-controls";
import { DiscountCodeForm } from "@/components/cart/discount-code-form";
import { getCart } from "@/modules/cart/repository";
import { quoteCart } from "@/modules/quote/repository";
import { formatMoney } from "@/modules/currency/money";
import { countryName } from "@/modules/country/countries";
import { resolveImage } from "@/modules/media/resolve-image";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const cart = await getCart();
  const quote = cart.lines.length ? await quoteCart(cart) : null;
  return (
    <Container className="page-section cart-page">
      <div className="page-intro">
        <p className="eyebrow">Your selections</p>
        <h1>Your cart.</h1>
        <p>
          Shopping destination: {countryName(cart.destinationCountry)} · Prices
          shown in {cart.currency}.
        </p>
      </div>
      {!cart.lines.length ? (
        <div className="empty-state">
          <h2>Your cart is waiting.</h2>
          <p>
            Explore the collection and choose something made for your space.
          </p>
          <Link href="/shop" className="button">
            Explore all pieces
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
                    <span>No image</span>
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
                  {line.options.map((option) => (
                    <p className="cart-option" key={option.optionId}>
                      <span>{option.label}</span>{" "}
                      {option.values.map((value) => value.label).join(", ")}
                    </p>
                  ))}
                  {!line.valid && (
                    <p className="cart-line-error" role="alert">
                      {line.message}
                    </p>
                  )}
                  <CartLineControls lineId={line.id} quantity={line.quantity} />
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
                      each
                    </span>
                  )}
                </p>
              </article>
            ))}
          </div>
          <aside className="cart-summary">
            <h2>Summary</h2>
            <div>
              <span>Products</span>
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
              <p className="cart-error">{quote.discountMessage}</p>
            )}
            <div>
              <span>Shipping</span>
              <strong>
                {quote?.shipping
                  ? quote.shipping.free
                    ? "Free"
                    : formatMoney(quote.shippingGrossAmount, cart.currency)
                  : "Unavailable"}
              </strong>
            </div>
            {quote?.shipping && (
              <p className="cart-summary-note">
                {quote.shipping.methodName} · {quote.shipping.zoneName}
                {quote.shipping.estimatedDelivery
                  ? ` · ${quote.shipping.estimatedDelivery}`
                  : ""}
              </p>
            )}
            <div>
              <span>Net amount</span>
              <strong>
                {formatMoney(quote?.netAmount ?? cart.subtotal, cart.currency)}
              </strong>
            </div>
            <div>
              <span>
                VAT
                {quote?.taxRates.length
                  ? ` (${quote.taxRates.map((rate) => rate / 100 + "%").join(", ")})`
                  : ""}
              </span>
              <strong>
                {formatMoney(quote?.taxAmount ?? 0, cart.currency)}
              </strong>
            </div>
            <div className="cart-summary-total">
              <span>Estimated total</span>
              <strong>
                {formatMoney(
                  quote?.totalAmount ?? cart.subtotal,
                  cart.currency,
                )}
              </strong>
            </div>
            <DiscountCodeForm code={cart.discountCode} />
            <p>{quote?.taxMessage}</p>
            {quote && !quote.destinationSupported && (
              <p className="cart-error">
                We do not currently ship to this destination.
              </p>
            )}
            {quote?.destinationSupported && !quote.shipping && (
              <p className="cart-error">
                No shipping rate matches this cart. Please contact Macmaer.
              </p>
            )}
            <p>
              This remains an estimate until the shipping address is confirmed
              during checkout.
            </p>
            {quote?.destinationSupported && quote.shipping ? (
              <Link className="button" href="/checkout">
                Continue to checkout
              </Link>
            ) : (
              <button className="button" disabled>
                Checkout unavailable
              </button>
            )}
            <Link href="/shop" className="text-link">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </Container>
  );
}
