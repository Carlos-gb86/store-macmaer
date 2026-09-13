import { describe, expect, it } from "vitest";
import { parseEnv, serverEnvSchema } from "@/lib/env/schema";
import { serverErrorRecord } from "@/lib/observability/server-errors";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";

describe("Phase 8 browser security", () => {
  it("permits only the configured database and required Stripe surfaces", () => {
    const policy = contentSecurityPolicy({
      isDevelopment: false,
      supabaseUrl: "https://shop.supabase.co/path",
    });
    expect(policy).toContain("connect-src 'self' https://shop.supabase.co");
    expect(policy).toContain("wss://shop.supabase.co");
    expect(policy).toContain("https://api.stripe.com");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("/path");
  });

  it("sets clickjacking, MIME, referrer, permissions, and CSP headers", () => {
    const headers = Object.fromEntries(
      securityHeaders({ isDevelopment: true }).map(({ key, value }) => [
        key,
        value,
      ]),
    );
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });
});

describe("Phase 8 runtime safety", () => {
  const checkout = {
    CATALOG_SOURCE: "demo" as const,
    CHECKOUT_ENABLED: "true" as const,
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    CUSTOMER_IDENTITY_HASH_SECRET: "a".repeat(32),
  };

  it("rejects crossed Stripe test and live credentials", () => {
    expect(() =>
      parseEnv(serverEnvSchema, {
        ...checkout,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
        STRIPE_SECRET_KEY: "sk_live_example",
      }),
    ).toThrow("STRIPE_SECRET_KEY");
  });

  it("rejects malformed enabled-provider credentials and indexed HTTP sites", () => {
    expect(() =>
      parseEnv(serverEnvSchema, {
        ...checkout,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "public",
        STRIPE_SECRET_KEY: "secret",
        STRIPE_WEBHOOK_SECRET: "webhook",
      }),
    ).toThrow("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(() =>
      parseEnv(serverEnvSchema, {
        CATALOG_SOURCE: "demo",
        SEO_INDEXING_ENABLED: "true",
        NEXT_PUBLIC_SITE_URL: "http://example.com",
      }),
    ).toThrow("NEXT_PUBLIC_SITE_URL");
  });

  it("logs correlation fields without messages, headers, or query strings", () => {
    const error = Object.assign(new Error("customer@example.com secret"), {
      code: "PGRST500",
      digest: "safe-digest",
    });
    const record = serverErrorRecord(error, {
      method: "GET",
      path: "/checkout?client_secret=hidden",
      routePath: "/checkout",
      routeType: "render",
    });
    expect(record).toMatchObject({
      event: "unhandled_request_error",
      errorName: "Error",
      errorCode: "PGRST500",
      digest: "safe-digest",
      path: "/checkout",
    });
    expect(JSON.stringify(record)).not.toContain("customer@example.com");
    expect(JSON.stringify(record)).not.toContain("client_secret");
  });
});
