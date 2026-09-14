import "server-only";

import { cookies, headers } from "next/headers";
import {
  defaultStorefrontLocale,
  isStorefrontLocale,
  LOCALE_COOKIE,
  type StorefrontLocale,
} from "./config";
import { storefrontMessages } from "./messages";

export async function getStorefrontLocale(): Promise<StorefrontLocale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isStorefrontLocale(saved)) return saved;
  const accepted = (await headers()).get("accept-language")?.toLowerCase();
  return accepted
    ?.split(",")
    .some((language) => language.trim().startsWith("sv"))
    ? "sv"
    : defaultStorefrontLocale;
}

export async function getStorefrontMessages() {
  return storefrontMessages[await getStorefrontLocale()];
}
