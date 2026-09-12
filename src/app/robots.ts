import type { MetadataRoute } from "next";
import { getServerEnv } from "@/lib/env/server";
import { siteUrl } from "@/modules/seo/site";

export default function robots(): MetadataRoute.Robots {
  const enabled = getServerEnv().SEO_INDEXING_ENABLED;
  return {
    rules: enabled
      ? {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin/", "/api/", "/cart", "/checkout/", "/order/"],
        }
      : { userAgent: "*", disallow: "/" },
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
