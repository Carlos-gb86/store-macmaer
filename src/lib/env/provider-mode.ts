export type ProviderMode = "test" | "live";

export function stripeKeyMode(
  value: string | undefined,
  kind: "publishable" | "secret",
): ProviderMode | null {
  if (!value) return null;
  const prefix = kind === "publishable" ? "pk_" : "sk_";
  if (value.startsWith(`${prefix}test_`)) return "test";
  if (value.startsWith(`${prefix}live_`)) return "live";
  return null;
}
