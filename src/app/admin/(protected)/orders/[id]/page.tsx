import Link from "next/link";
import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import { getServerEnv } from "@/lib/env/server";
import {
  FulfilmentForm,
  OrderNoteForm,
  RefundForm,
  ResendEmailForm,
} from "@/components/admin/order-controls";
import { formatCataloguePrice } from "@/modules/catalog/format";
import { minorUnitsInput } from "@/modules/admin/money";
import { checkoutAddressSchema } from "@/modules/checkout/schema";
import { cartOptionsSnapshotSchema } from "@/modules/cart/schema";
import { getAdminOrder } from "@/modules/orders/repository";

function words(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("en-SE") : "—";
}

function Address({ value }: { value: Json }) {
  const parsed = checkoutAddressSchema.safeParse(value);
  if (!parsed.success) return <span>Address snapshot unavailable</span>;
  const address = parsed.data;
  return (
    <address>
      {address.name}
      <br />
      {address.line1}
      <br />
      {address.line2 && (
        <>
          {address.line2}
          <br />
        </>
      )}
      {address.postalCode} {address.city}
      <br />
      {address.region && (
        <>
          {address.region}
          <br />
        </>
      )}
      {address.country}
    </address>
  );
}

function options(value: Json) {
  const parsed = cartOptionsSnapshotSchema.safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.map(
    (option) =>
      `${option.label}: ${option.values.map((item) => item.label).join(", ")}`,
  );
}

function shippingName(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return "Shipping";
  return typeof value.methodName === "string" ? value.methodName : "Shipping";
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminOrder(id);
  const { order } = data;
  const succeededRefunds = data.refunds.filter(
    (refund) => refund.status === "SUCCEEDED",
  );
  const reservedRefundTotal = data.refunds
    .filter((refund) =>
      ["REQUESTED", "PENDING", "SUCCEEDED"].includes(refund.status),
    )
    .reduce((total, refund) => total + refund.amount, 0);
  const remainingRefund = Math.max(0, order.total_amount - reservedRefundTotal);
  const refundsEnabled = getServerEnv().REFUNDS_ENABLED;
  const canRefund =
    refundsEnabled &&
    remainingRefund > 0 &&
    ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(order.payment_status);
  return (
    <>
      <Link className="back-link" href="/admin/orders">
        ← All orders
      </Link>
      <div className="page-heading">
        <div>
          <h1>{order.order_number}</h1>
          <p className="section-intro">
            Placed {dateTime(order.created_at)} · {order.destination_country}
          </p>
        </div>
        <div className="order-statuses">
          <span className="status-badge">
            Payment: {words(order.payment_status)}
          </span>
          <span className="status-badge">
            Fulfilment: {words(order.fulfilment_status)}
          </span>
        </div>
      </div>

      <div className="order-detail-grid">
        <main>
          <section className="admin-card">
            <h2>Order snapshot</h2>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Qty</th>
                    <th>Net</th>
                    <th>VAT</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.product_title}</strong>
                        <small>{item.sku || "No SKU"}</small>
                        {options(item.selected_options).map((option) => (
                          <small key={option}>{option}</small>
                        ))}
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        {formatCataloguePrice(item.net_amount, order.currency)}
                      </td>
                      <td>
                        {formatCataloguePrice(item.tax_amount, order.currency)}
                        <small>{item.tax_rate_basis_points / 100}%</small>
                      </td>
                      <td>
                        {formatCataloguePrice(
                          item.gross_amount - item.discount_amount,
                          order.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="order-totals">
              <div>
                <dt>Merchandise</dt>
                <dd>
                  {formatCataloguePrice(
                    order.merchandise_amount,
                    order.currency,
                  )}
                </dd>
              </div>
              {order.discount_amount > 0 && (
                <div>
                  <dt>
                    Discount{" "}
                    {order.discount_code ? `(${order.discount_code})` : ""}
                  </dt>
                  <dd>
                    −
                    {formatCataloguePrice(
                      order.discount_amount,
                      order.currency,
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>{shippingName(order.shipping_method_snapshot)}</dt>
                <dd>
                  {formatCataloguePrice(
                    order.shipping_gross_amount,
                    order.currency,
                  )}
                </dd>
              </div>
              <div>
                <dt>Net</dt>
                <dd>
                  {formatCataloguePrice(order.net_amount, order.currency)}
                </dd>
              </div>
              <div>
                <dt>VAT / tax</dt>
                <dd>
                  {formatCataloguePrice(order.tax_amount, order.currency)}
                </dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>
                  {formatCataloguePrice(order.total_amount, order.currency)}
                </dd>
              </div>
            </dl>
            <p className="field-note">{order.tax_message}</p>
          </section>

          <section className="admin-card">
            <h2>Customer and delivery</h2>
            <div className="admin-grid">
              <div>
                <h3>Contact</h3>
                <p>
                  {order.customer_name}
                  <br />
                  <a href={`mailto:${order.customer_email}`}>
                    {order.customer_email}
                  </a>
                  <br />
                  <a href={`tel:${order.customer_phone}`}>
                    {order.customer_phone}
                  </a>
                </p>
              </div>
              <div>
                <h3>Shipping address</h3>
                <Address value={order.shipping_address} />
              </div>
              <div>
                <h3>Billing address</h3>
                <Address value={order.billing_address} />
              </div>
            </div>
          </section>

          <section className="admin-card">
            <h2>Timeline</h2>
            <ol className="order-timeline">
              {data.events.map((event) => (
                <li key={event.id}>
                  <strong>{words(event.event_type)}</strong>
                  <span>
                    {dateTime(event.created_at)} · {words(event.source)}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="admin-card">
            <h2>Internal notes</h2>
            <OrderNoteForm orderId={order.id} />
            {data.notes.length > 0 && (
              <ul className="order-notes">
                {data.notes.map((note) => (
                  <li key={note.id}>
                    <p>{note.note}</p>
                    <small>{dateTime(note.created_at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <aside>
          <section className="admin-card">
            <h2>Fulfilment</h2>
            <p>
              <span className="status-badge">
                {words(order.fulfilment_status)}
              </span>
            </p>
            {data.fulfilment?.shipped_at && (
              <p className="field-note">
                Shipped {dateTime(data.fulfilment.shipped_at)}
              </p>
            )}
            <FulfilmentForm
              orderId={order.id}
              currentStatus={order.fulfilment_status}
              carrier={data.fulfilment?.carrier ?? null}
              trackingNumber={data.fulfilment?.tracking_number ?? null}
              trackingUrl={data.fulfilment?.tracking_url ?? null}
            />
          </section>

          <section className="admin-card">
            <h2>Payment</h2>
            <dl className="order-meta">
              <div>
                <dt>Provider</dt>
                <dd>{data.payment?.provider ?? "—"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{data.payment ? words(data.payment.status) : "—"}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>{dateTime(order.paid_at)}</dd>
              </div>
              <div>
                <dt>PaymentIntent</dt>
                <dd className="technical-id">
                  {data.payment?.stripe_payment_intent_id ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <h2>Refunds</h2>
            {data.refunds.map((refund) => (
              <div className="refund-row" key={refund.id}>
                <strong>
                  {formatCataloguePrice(refund.amount, refund.currency)}
                </strong>
                <span className="status-badge">{words(refund.status)}</span>
                <small>
                  {dateTime(refund.created_at)} · {words(refund.reason)}
                </small>
                {refund.provider_failure_reason && (
                  <small className="field-error">
                    {refund.provider_failure_reason}
                  </small>
                )}
              </div>
            ))}
            {canRefund ? (
              <RefundForm
                orderId={order.id}
                orderNumber={order.order_number}
                requestKey={randomUUID()}
                currency={order.currency}
                remainingAmount={minorUnitsInput(remainingRefund)}
              />
            ) : (
              <p className="muted">
                {!refundsEnabled
                  ? "Refund controls are disabled until the Stripe refund webhook is configured."
                  : "No refundable settled amount remains."}
              </p>
            )}
          </section>

          <section className="admin-card">
            <h2>Email</h2>
            <ResendEmailForm
              orderId={order.id}
              canShip={Boolean(data.fulfilment?.tracking_number)}
              refunds={succeededRefunds.map((refund) => ({
                id: refund.id,
                label: `${formatCataloguePrice(refund.amount, refund.currency)} · ${dateTime(refund.processed_at)}`,
              }))}
            />
            {data.emails.length > 0 && (
              <ul className="email-history">
                {data.emails.map((email) => (
                  <li key={email.id}>
                    <span>{words(email.kind)}</span>
                    <span className="status-badge">{words(email.status)}</span>
                    <small>{dateTime(email.sent_at ?? email.created_at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
