import Link from "next/link";
/* eslint-disable @next/next/no-img-element -- Private thumbnails use short-lived signed URLs. */
import { Image as ImageIcon } from "lucide-react";
import { imagePreviews } from "@/modules/admin/media";
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
  const { data: images, error: imageError } = data.length
    ? await client
        .from("product_images")
        .select("product_id,path,asset_id,is_primary,sort_order")
        .in(
          "product_id",
          data.map((p) => p.id),
        )
        .order("is_primary", { ascending: false })
        .order("sort_order")
    : { data: [], error: null };
  if (imageError) throw imageError;
  const thumbnails = await imagePreviews(
    client,
    data.map((p) => {
      const image = images.find((i) => i.product_id === p.id);
      return {
        id: p.id,
        path: image?.path ?? null,
        asset_id: image?.asset_id ?? null,
      };
    }),
  );
  return (
    <>
      <h1>Products</h1>
      <p className="section-intro">
        Manage your catalogue, from the first draft to the shop window.
      </p>
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
              <th className="sku-column">SKU</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link
                    className="product-row-link"
                    href={"/admin/products/" + p.id}
                  >
                    {thumbnails.get(p.id) ? (
                      <img
                        className="list-thumbnail"
                        src={thumbnails.get(p.id)!}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="list-thumbnail">
                        <ImageIcon size={22} aria-hidden="true" />
                      </span>
                    )}
                    {p.title}
                  </Link>
                </td>
                <td className="sku-column">{p.sku || "—"}</td>
                <td>
                  <span className={"status-badge " + p.status}>{p.status}</span>
                </td>
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
