"use client";
import { useActionState } from "react";
import { login } from "@/modules/admin/auth-actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action}>
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state && !state.ok && <p role="alert">{state.message}</p>}
      <button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p>Account and password help is managed privately by the shop owner.</p>
    </form>
  );
}
