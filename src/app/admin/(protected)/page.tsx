import Link from "next/link";
import { requireAdminPage } from "@/modules/admin/auth";
export default async function Dashboard() {
  const { client } = await requireAdminPage();
  const counts = await Promise.all(
    ["draft", "active", "archived"].map(async (status) => {
      const { count, error } = await client
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", status as "draft" | "active" | "archived");
      if (error) throw error;
      return { status, count };
    }),
  );
  return (
    <>
      <h1>Catalogue overview</h1>
      <p>
        Create a draft, configure its options, add images, preview, and publish.
      </p>
      <div className="admin-grid">
        {counts.map((c) => (
          <Link
            className="admin-card"
            key={c.status}
            href={"/admin/products?status=" + c.status}
          >
            <strong>{c.count}</strong> {c.status} products
          </Link>
        ))}
      </div>
      <Link className="button" href="/admin/products/new">
        Create product
      </Link>
    </>
  );
}
