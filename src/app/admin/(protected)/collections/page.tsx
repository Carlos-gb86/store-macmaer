import Link from "next/link";
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
    .select("id,name,active", { count: "exact" })
    .order("name")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (q) query = query.ilike("name", "%" + q + "%");
  if (status === "active" || status === "inactive")
    query = query.eq("active", status === "active");
  const { data, error, count } = await query;
  if (error) throw error;
  return (
    <>
      <h1>Collections</h1>
      <Link className="button" href="/admin/collections/new">
        Create collection
      </Link>
      <ListTools q={q} status={status} statuses={["active", "inactive"]} />
      {data.length ? (
        <table>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={"/admin/collections/" + c.id}>{c.name}</Link>
                </td>
                <td>{c.active ? "Active" : "Inactive"}</td>
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
