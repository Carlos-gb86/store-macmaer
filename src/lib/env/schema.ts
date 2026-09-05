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
});
export const serverEnvSchema = publicEnvSchema
  .extend({
    CATALOG_SOURCE: z.enum(["demo", "supabase"]).default("supabase"),
    SUPABASE_SERVICE_ROLE_KEY: optionalText,
  })
  .superRefine((env, ctx) => {
    if (env.CATALOG_SOURCE === "supabase") {
      for (const key of [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ] as const) {
        if (!env[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Required in Supabase mode",
          });
      }
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
