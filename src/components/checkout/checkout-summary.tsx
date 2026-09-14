import { formatMoney } from "@/modules/currency/money";
import type { CheckoutSummary as Summary } from "@/modules/checkout/schema";
import type { CheckoutDisplayItem } from "@/modules/checkout/schema";
import { formatOptions } from "@/modules/cart/format-options";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import {
  localizeCommerceMessage,
  localizeShippingLabel,
} from "@/modules/i18n/commerce";

export function CheckoutSummary({
  summary,
  items,
}: {
  summary: Summary;
  items: CheckoutDisplayItem[];
}) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  return (
    <aside
      className="checkout-summary"
      aria-label={sv ? "Ordersammanfattning" : "Order summary"}
    >
      <h2>{sv ? "Ordersammanfattning" : "Order summary"}</h2>
      <ul className="checkout-items">
        {items.map((item) => (
          <li key={item.id}>
            <strong>
              {item.title} × {item.quantity}
            </strong>
            {formatOptions(item.options).map((option, index) => (
              <span key={`${index}:${option}`}>{option}</span>
            ))}
          </li>
        ))}
      </ul>
      <dl>
        <div>
          <dt>{sv ? "Produkter" : "Products"}</dt>
          <dd>{formatMoney(summary.merchandiseAmount, summary.currency)}</dd>
        </div>
        {summary.discountAmount > 0 && (
          <div className="checkout-discount">
            <dt>{sv ? "Rabatt" : "Discount"}</dt>
            <dd>−{formatMoney(summary.discountAmount, summary.currency)}</dd>
          </div>
        )}
        <div>
          <dt>{sv ? "Frakt" : "Shipping"}</dt>
          <dd>
            {summary.shippingAmount === 0
              ? sv
                ? "Kostnadsfri"
                : "Free"
              : formatMoney(summary.shippingAmount, summary.currency)}
          </dd>
        </div>
        <div>
          <dt>{sv ? "Nettobelopp" : "Net amount"}</dt>
          <dd>{formatMoney(summary.netAmount, summary.currency)}</dd>
        </div>
        <div>
          <dt>{sv ? "Moms" : "VAT"}</dt>
          <dd>{formatMoney(summary.taxAmount, summary.currency)}</dd>
        </div>
        <div className="checkout-total">
          <dt>{sv ? "Totalt" : "Total"}</dt>
          <dd>{formatMoney(summary.totalAmount, summary.currency)}</dd>
        </div>
      </dl>
      <p>{localizeShippingLabel(summary.shippingMethod, locale)}</p>
      <p>{localizeCommerceMessage(summary.taxMessage, locale)}</p>
    </aside>
  );
}
