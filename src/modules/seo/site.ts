import { getPublicEnv } from "@/lib/env/public";

export function siteUrl(path = "/") {
  const base = getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return new URL(path, `${base}/`).toString();
}

export function absoluteAsset(path: string) {
  return path.startsWith("http://") || path.startsWith("https://")
    ? path
    : siteUrl(path);
}

export const socialProfiles = [
  "https://www.instagram.com/macmaer_knots/",
  "https://www.youtube.com/@macmaerknots5116",
  "https://www.etsy.com/shop/Macmaer",
  "https://www.pinterest.se/macmaerknots/",
];
