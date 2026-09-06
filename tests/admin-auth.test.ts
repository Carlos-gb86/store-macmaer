import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut },
    rpc: mocks.rpc,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("redirect:" + path);
  },
}));
import { login } from "@/modules/admin/auth-actions";
function credentials() {
  const form = new FormData();
  form.set("email", "  owner@example.test  ");
  form.set("password", " PrivatePassword123! ");
  return form;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => vi.restoreAllMocks());
it("trims email, preserves password and redirects only after administrator verification", async () => {
  await expect(login(null, credentials())).rejects.toThrow("redirect:/admin");
  expect(mocks.signIn).toHaveBeenCalledWith({
    email: "owner@example.test",
    password: " PrivatePassword123! ",
  });
  expect(mocks.rpc).toHaveBeenCalledWith("is_admin");
});
it.each([
  [
    new AuthApiError("Private provider details", 400, "invalid_credentials"),
    "unauthorized",
    "Check your email and password",
  ],
  [
    new AuthApiError(
      "Private provider details",
      422,
      "email_provider_disabled",
    ),
    "unexpected",
    "currently unavailable",
  ],
  [
    new AuthRetryableFetchError("Private connection details", 503),
    "unexpected",
    "currently unavailable",
  ],
  [
    new AuthApiError(
      "Private provider details",
      429,
      "over_request_rate_limit",
    ),
    "unauthorized",
    "Too many sign-in attempts",
  ],
])(
  "handles Auth failure %s without logging private data",
  async (error, code, message) => {
    mocks.signIn.mockResolvedValue({ error });
    expect(await login(null, credentials())).toMatchObject({
      ok: false,
      code,
      message: expect.stringContaining(message),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({
        event: "admin_sign_in_failed",
        code: error.code ?? "unknown",
        status: error.status,
        name: error.name,
      }),
    );
  },
);
it("signs out when the allow-list lookup fails and reports an operational error", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST000" } });
  expect(await login(null, credentials())).toMatchObject({
    ok: false,
    code: "unexpected",
  });
  expect(mocks.signOut).toHaveBeenCalledOnce();
  expect(console.error).toHaveBeenCalledWith(
    JSON.stringify({ event: "admin_access_check_failed", code: "PGRST000" }),
  );
});
it("signs out an authenticated user without administrator membership", async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect(await login(null, credentials())).toMatchObject({
    ok: false,
    code: "forbidden",
  });
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
