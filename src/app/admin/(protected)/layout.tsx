import Link from "next/link";
import { AdminNavigation } from "@/components/admin/navigation";
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
        <Link className="admin-brand" href="/admin">
          Macmaer <small>/ Admin</small>
        </Link>
        <AdminNavigation />
        <div className="admin-account">
          <span>{user.email}</span>
          <form action={logout}>
            <button>Sign out</button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </>
  );
}
