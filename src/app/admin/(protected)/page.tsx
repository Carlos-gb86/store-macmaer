import Link from "next/link";
import { requireAdminPage } from "@/modules/admin/auth";
import { formatCataloguePrice } from "@/modules/catalog/format";
export default async function Dashboard() {
  const { client } = await requireAdminPage();
  const [unfulfilled, recent] = await Promise.all([
    client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("payment_status", ["SUCCEEDED", "PARTIALLY_REFUNDED"])
      .eq("fulfilment_status", "UNFULFILLED"),
    client
      .from("orders")
      .select(
        "id,order_number,customer_name,currency,total_amount,fulfilment_status",
      )
      .in("payment_status", ["SUCCEEDED", "PARTIALLY_REFUNDED"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (unfulfilled.error) throw unfulfilled.error;
  if (recent.error) throw recent.error;
  return (
    <>
      <h1>Dashboard</h1>
      <p className="section-intro">
        A quick view of handmade orders waiting for you.
      </p>
      <div className="dashboard-stats">
        <Link
          className="admin-card"
          href="/admin/orders?fulfilment=UNFULFILLED&payment=SUCCEEDED"
        >
          <span>New paid orders</span>
          <strong>{unfulfilled.count ?? 0}</strong>
        </Link>
        <Link className="admin-card" href="/admin/orders">
          <span>Recent paid orders</span>
          <strong>{recent.data.length}</strong>
        </Link>
      </div>
      <section className="admin-card">
        <div className="page-heading">
          <h2>Recent orders</h2>
          <Link href="/admin/orders">View all →</Link>
        </div>
        {recent.data.length ? (
          <ul className="dashboard-orders">
            {recent.data.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`}>
                  {order.order_number}
                </Link>
                <span>{order.customer_name}</span>
                <span>
                  {formatCataloguePrice(order.total_amount, order.currency)}
                </span>
                <span className="status-badge">
                  {order.fulfilment_status.replaceAll("_", " ").toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No paid orders yet.</p>
        )}
      </section>
      <div className="admin-card dashboard-help">
        <h2>Store tools</h2>
        <p>
          Products are made to order, so fulfilment starts only after Stripe
          confirms payment.
        </p>
        <div className="admin-actions">
          <Link href="/admin/orders">Manage orders →</Link>
          <Link href="/admin/products/new">Create product →</Link>
          <Link href="/admin/media">Upload photos →</Link>
          <Link href="/admin/content">Edit homepage →</Link>
          <Link href="/" target="_blank">
            View shop ↗
          </Link>
        </div>
      </div>
    </>
  );
}
