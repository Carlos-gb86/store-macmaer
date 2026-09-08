import Link from "next/link";
export function ListTools({
  q,
  status,
  statuses = [],
}: {
  q: string;
  status: string;
  statuses?: string[];
}) {
  return (
    <form className="admin-filters">
      <label>
        Search
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          type="search"
        />
      </label>
      {statuses.length > 0 && (
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
      <button>Search</button>
    </form>
  );
}
export function Pagination({
  page,
  count,
  q,
  status,
}: {
  page: number;
  count: number;
  q: string;
  status: string;
}) {
  const url = (n: number) =>
    "?" + new URLSearchParams({ q, status, page: String(n) });
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && <Link href={url(page - 1)}>Previous</Link>}
      <span>
        Page {page} · {count} results
      </span>
      {page * 20 < count && <Link href={url(page + 1)}>Next</Link>}
    </nav>
  );
}
