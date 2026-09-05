import { LoginForm } from "@/components/admin/login-form";
export default function LoginPage() {
  return (
    <main className="admin-login">
      <h1>Macmaer administration</h1>
      <p>Sign in with your privately provisioned shop account.</p>
      <LoginForm />
    </main>
  );
}
