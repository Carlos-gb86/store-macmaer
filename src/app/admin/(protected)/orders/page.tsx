import Link from "next/link";
import { formatCataloguePrice } from "@/modules/catalog/format";
import {
  listAdminOrders,
  parseOrderFilters,
} from "@/modules/orders/repository";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseOrderFilters(await searchParams);
  const { orders, count } = await listAdminOrders(filters);
  const query = (page: number) =>
    `?${new URLSearchParams({
      q: filters.q,
      status: filters.status,
      payment: filters.payment,
      fulfilment: filters.fulfilment,
      country: filters.country,
      from: filters.from,
      to: filters.to,
      page: String(page),
    })}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Orders</h1>
          <p className="section-intro">
            Paid orders are made to order. Move them through production, add
            tracking, send updates, and manage provider-confirmed refunds.
          </p>
        </div>
        <details className="admin-disclosure order-export">
          <summary>Accounting export</summary>
          <form action="/admin/orders/export">
            <label>
              From
              <input type="date" name="from" />
            </label>
            <label>
              Through
              <input type="date" name="to" />
            </label>
            <button>Download CSV</button>
          </form>
        </details>
      </div>
      <form className="admin-filters">
        <label>
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Order, name, or email"
          />
        </label>
        <label>
          Order status
          <select name="status" defaultValue={filters.status}>
            <option value="">All</option>
            {[
              "PENDING_PAYMENT",
              "PAID",
              "PROCESSING",
              "READY_TO_SHIP",
              "SHIPPED",
              "DELIVERED",
              "CANCELLED",
              "PARTIALLY_REFUNDED",
              "REFUNDED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select name="payment" defaultValue={filters.payment}>
            <option value="">All</option>
            {[
              "REQUIRES_PAYMENT",
              "PROCESSING",
              "SUCCEEDED",
              "FAILED",
              "PARTIALLY_REFUNDED",
              "REFUNDED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Fulfilment
          <select name="fulfilment" defaultValue={filters.fulfilment}>
            <option value="">All</option>
            {[
              "UNFULFILLED",
              "PROCESSING",
              "READY_TO_SHIP",
              "SHIPPED",
              "DELIVERED",
              "CANCELLED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Country
          <input name="country" defaultValue={filters.country} maxLength={2} />
        </label>
        <label>
          From
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label>
          Through
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <button>Filter</button>
      </form>
      {orders.length ? (
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      className="order-link"
                      href={`/admin/orders/${order.id}`}
                    >
                      {order.order_number}
                    </Link>
                    <small>{order.destination_country}</small>
                  </td>
                  <td>
                    {order.customer_name}
                    <small>{order.customer_email}</small>
                  </td>
                  <td>
                    {new Date(order.created_at).toLocaleDateString("en-SE")}
                  </td>
                  <td>
                    {formatCataloguePrice(order.total_amount, order.currency)}
                  </td>
                  <td>
                    <span className="status-badge">
                      {label(order.payment_status)}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge">
                      {label(order.fulfilment_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No orders match these filters.</div>
      )}
      <nav className="pagination" aria-label="Order pagination">
        {filters.page > 1 && (
          <Link href={query(filters.page - 1)}>Previous</Link>
        )}
        <span>
          Page {filters.page} · {count} orders
        </span>
        {filters.page * 30 < count && (
          <Link href={query(filters.page + 1)}>Next</Link>
        )}
      </nav>
    </>
  );
}
