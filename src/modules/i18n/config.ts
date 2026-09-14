export const storefrontLocales = ["en", "sv"] as const;
export type StorefrontLocale = (typeof storefrontLocales)[number];
export const defaultStorefrontLocale: StorefrontLocale = "en";
export const LOCALE_COOKIE = "macmaer_locale";

export function isStorefrontLocale(value: unknown): value is StorefrontLocale {
  return storefrontLocales.includes(value as StorefrontLocale);
}
