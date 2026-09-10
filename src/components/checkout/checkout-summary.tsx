import { formatMoney } from "@/modules/currency/money";
import type { CheckoutSummary as Summary } from "@/modules/checkout/schema";

export function CheckoutSummary({ summary }: { summary: Summary }) {
  return (
    <aside className="checkout-summary" aria-label="Order summary">
      <h2>Order summary</h2>
      <dl>
        <div>
          <dt>Products</dt>
          <dd>{formatMoney(summary.merchandiseAmount, summary.currency)}</dd>
        </div>
        {summary.discountAmount > 0 && (
          <div className="checkout-discount">
            <dt>Discount</dt>
            <dd>−{formatMoney(summary.discountAmount, summary.currency)}</dd>
          </div>
        )}
        <div>
          <dt>Shipping</dt>
          <dd>
            {summary.shippingAmount === 0
              ? "Free"
              : formatMoney(summary.shippingAmount, summary.currency)}
          </dd>
        </div>
        <div>
          <dt>Net amount</dt>
          <dd>{formatMoney(summary.netAmount, summary.currency)}</dd>
        </div>
        <div>
          <dt>VAT</dt>
          <dd>{formatMoney(summary.taxAmount, summary.currency)}</dd>
        </div>
        <div className="checkout-total">
          <dt>Total</dt>
          <dd>{formatMoney(summary.totalAmount, summary.currency)}</dd>
        </div>
      </dl>
      <p>{summary.shippingMethod}</p>
      <p>{summary.taxMessage}</p>
    </aside>
  );
}
