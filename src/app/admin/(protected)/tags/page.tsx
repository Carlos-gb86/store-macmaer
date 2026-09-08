import { TagDialogButton } from "@/components/admin/tag-editor";
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
    .select("id,name,slug,updated_at", { count: "exact" })
    .order("name")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (q) query = query.ilike("name", "%" + q + "%");
  const { data, error, count } = await query;
  if (error) throw error;
  const { data: targets, error: targetError } = await client
    .from("tags")
    .select("id,name,slug,updated_at")
    .order("name");
  if (targetError) throw targetError;
  return (
    <>
      <h1>Tags</h1>
      <p className="muted">
        Organise products with labels. Create or edit a tag without leaving this
        page.
      </p>
      <TagDialogButton />
      <ListTools q={q} status={status} />
      {data.length ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td>
                  <TagDialogButton initial={t} targets={targets} />
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
