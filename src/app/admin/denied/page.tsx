import { logout } from "@/modules/admin/auth-actions";
export default function Denied() {
  return (
    <main className="admin-login">
      <h1>Administrator access required</h1>
      <p>This account does not have access to the shop administration.</p>
      <form action={logout}>
        <button>Sign out</button>
      </form>
    </main>
  );
}
