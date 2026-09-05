import Link from "next/link";
import { requireAdminPage } from "@/modules/admin/auth";
import { logout } from "@/modules/admin/auth-actions";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdminPage();
  return (
    <>
      <header className="admin-header">
        <Link href="/admin">Macmaer / Admin</Link>
        <nav aria-label="Administration">
          {["products", "collections", "tags", "media", "content"].map(
            (item) => (
              <Link key={item} href={"/admin/" + item}>
                {item}
              </Link>
            ),
          )}
        </nav>
        <span>{user.email}</span>
        <form action={logout}>
          <button>Sign out</button>
        </form>
      </header>
      <main className="admin-main">{children}</main>
    </>
  );
}
