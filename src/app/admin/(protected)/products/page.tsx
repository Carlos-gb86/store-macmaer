import Link from "next/link";
import { requireAdminPage } from "@/modules/admin/auth";
import { searchInput, type SearchParams } from "@/modules/admin/queries";
import { ListTools, Pagination } from "@/components/admin/list-tools";
export default async function Products({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { client } = await requireAdminPage();
  const { q, page, status } = searchInput(await searchParams);
  let query = client
    .from("products")
    .select("id,title,status,sku", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (q) query = query.or(`title.ilike.%${q}%,sku.ilike.%${q}%`);
  if (["draft", "active", "archived"].includes(status))
    query = query.eq("status", status as "draft" | "active" | "archived");
  const { data, error, count } = await query;
  if (error) throw error;
  return (
    <>
      <h1>Products</h1>
      <Link className="button" href="/admin/products/new">
        Create product
      </Link>
      <ListTools
        q={q}
        status={status}
        statuses={["draft", "active", "archived"]}
      />
      {data.length ? (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={"/admin/products/" + p.id}>{p.title}</Link>
                </td>
                <td>{p.sku || "—"}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No products found. Create a draft or adjust your search.</p>
      )}
      <Pagination page={page} count={count ?? 0} q={q} status={status} />
    </>
  );
}
