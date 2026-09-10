import { describe, expect, it } from "vitest";
import { parseEnv, publicEnvSchema, serverEnvSchema } from "@/lib/env/schema";
describe("environment boundaries", () => {
  it("requires Supabase by default and allows explicitly selected fixtures", () => {
    expect(() => parseEnv(serverEnvSchema, {})).toThrow(
      "Invalid environment configuration",
    );
    expect(
      parseEnv(serverEnvSchema, { CATALOG_SOURCE: "demo" }).CATALOG_SOURCE,
    ).toBe("demo");
    expect(() =>
      parseEnv(serverEnvSchema, {
        CATALOG_SOURCE: "supabase",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
      }),
    ).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });
  it("validates supplied URLs even in demo mode", () => {
    expect(() =>
      parseEnv(serverEnvSchema, {
        CATALOG_SOURCE: "demo",
        NEXT_PUBLIC_SITE_URL: "invalid",
      }),
    ).toThrow("NEXT_PUBLIC_SITE_URL");
  });
  it("keeps checkout off by default and requires every payment secret when enabled", () => {
    expect(
      parseEnv(serverEnvSchema, { CATALOG_SOURCE: "demo" }).CHECKOUT_ENABLED,
    ).toBe(false);
    expect(() =>
      parseEnv(serverEnvSchema, {
        CATALOG_SOURCE: "demo",
        CHECKOUT_ENABLED: "true",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
        STRIPE_SECRET_KEY: "sk_test_example",
      }),
    ).toThrow("STRIPE_WEBHOOK_SECRET");
  });
  it("strips server secrets from public configuration and errors", () => {
    const input = {
      CATALOG_SOURCE: "demo",
      SUPABASE_SERVICE_ROLE_KEY: "private-secret-value",
      STRIPE_SECRET_KEY: "another-secret",
    };
    expect(JSON.stringify(parseEnv(publicEnvSchema, input))).not.toContain(
      "secret",
    );
    expect(() =>
      parseEnv(serverEnvSchema, {
        ...input,
        NEXT_PUBLIC_SUPABASE_URL: "private-secret-value",
      }),
    ).toThrow("Invalid environment configuration: NEXT_PUBLIC_SUPABASE_URL");
  });
});
