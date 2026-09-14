"use server";

import { cookies } from "next/headers";
import { isStorefrontLocale, LOCALE_COOKIE } from "./config";

export async function setStorefrontLocale(input: unknown) {
  if (!isStorefrontLocale(input)) return { ok: false as const };
  (await cookies()).set(LOCALE_COOKIE, input, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    priority: "high",
  });
  return { ok: true as const };
}
