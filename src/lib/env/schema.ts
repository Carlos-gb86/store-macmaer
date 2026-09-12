import { z } from "zod";
const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalText,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalText,
});
export const serverEnvSchema = publicEnvSchema
  .extend({
    CATALOG_SOURCE: z.enum(["demo", "supabase"]).default("supabase"),
    SUPABASE_SERVICE_ROLE_KEY: optionalText,
    STRIPE_SECRET_KEY: optionalText,
    STRIPE_WEBHOOK_SECRET: optionalText,
    RESEND_API_KEY: optionalText,
    EMAIL_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    CUSTOMER_IDENTITY_HASH_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    CHECKOUT_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    REFUNDS_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.CATALOG_SOURCE === "supabase") {
      for (const key of [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ] as const) {
        if (!env[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Required in Supabase mode",
          });
      }
    }
    if (env.CHECKOUT_ENABLED) {
      for (const key of [
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "CUSTOMER_IDENTITY_HASH_SECRET",
      ] as const) {
        if (!env[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Required when checkout is enabled",
          });
      }
    }
    if (env.EMAIL_ENABLED && !env.RESEND_API_KEY)
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "Required when transactional email is enabled",
      });
    if (env.REFUNDS_ENABLED) {
      for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const)
        if (!env[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Required when refunds are enabled",
          });
    }
  });
export function parseEnv<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(
      "Invalid environment configuration: " +
        result.error.issues.map((issue) => issue.path.join(".")).join(", "),
    );
  }
  return result.data;
}
