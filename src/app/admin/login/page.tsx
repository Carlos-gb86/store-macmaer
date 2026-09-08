import { LoginForm } from "@/components/admin/login-form";
import Link from "next/link";
export default function LoginPage() {
  return (
    <main className="admin-login">
      <Link className="back-link" href="/">
        ← Back to the shop
      </Link>
      <div className="admin-card">
        <p className="field-note">MACMAER · SHOP ADMINISTRATION</p>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage your catalogue and homepage.</p>
        <LoginForm />
      </div>
    </main>
  );
}
