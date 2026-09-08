import Link from "next/link";
/* eslint-disable @next/next/no-img-element -- Private thumbnails use signed URLs. */
import { Image as ImageIcon } from "lucide-react";
import { imagePreviews } from "@/modules/admin/media";
import { requireAdminPage } from "@/modules/admin/auth";
import { searchInput, type SearchParams } from "@/modules/admin/queries";
import { ListTools, Pagination } from "@/components/admin/list-tools";
export default async function Collections({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { client } = await requireAdminPage(),
    { q, page, status } = searchInput(await searchParams);
  let query = client
    .from("collections")
    .select("id,name,active,image_path,asset_id", { count: "exact" })
    .order("name")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (q) query = query.ilike("name", "%" + q + "%");
  if (status === "active" || status === "inactive")
    query = query.eq("active", status === "active");
  const { data, error, count } = await query;
  if (error) throw error;
  const thumbnails = await imagePreviews(
    client,
    data.map((c) => ({ id: c.id, path: c.image_path, asset_id: c.asset_id })),
  );
  return (
    <>
      <h1>Collections</h1>
      <p className="section-intro">
        Group products by material, style or season.
      </p>
      <Link className="button" href="/admin/collections/new">
        Create collection
      </Link>
      <ListTools q={q} status={status} statuses={["active", "inactive"]} />
      {data.length ? (
        <table>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link
                    className="product-row-link"
                    href={"/admin/collections/" + c.id}
                  >
                    {thumbnails.get(c.id) ? (
                      <img
                        className="list-thumbnail"
                        src={thumbnails.get(c.id)!}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="list-thumbnail">
                        <ImageIcon size={22} />
                      </span>
                    )}
                    {c.name}
                  </Link>
                </td>
                <td>
                  <span
                    className={
                      "status-badge " + (c.active ? "active" : "archived")
                    }
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No collections found.</p>
      )}
      <Pagination page={page} count={count ?? 0} q={q} status={status} />
    </>
  );
}
