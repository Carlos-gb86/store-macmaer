import Link from "next/link";
import { requireAdminPage } from "@/modules/admin/auth";
import { searchInput, type SearchParams } from "@/modules/admin/queries";
import { ListTools, Pagination } from "@/components/admin/list-tools";
export default async function Tags({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { client } = await requireAdminPage(),
    { q, page, status } = searchInput(await searchParams);
  let query = client
    .from("tags")
    .select("id,name,slug", { count: "exact" })
    .order("name")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (q) query = query.ilike("name", "%" + q + "%");
  const { data, error, count } = await query;
  if (error) throw error;
  return (
    <>
      <h1>Tags</h1>
      <Link className="button" href="/admin/tags/new">
        Create tag
      </Link>
      <ListTools q={q} status={status} />
      {data.length ? (
        <table>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={"/admin/tags/" + t.id}>{t.name}</Link>
                </td>
                <td>{t.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No tags found.</p>
      )}
      <Pagination page={page} count={count ?? 0} q={q} status={status} />
    </>
  );
}
