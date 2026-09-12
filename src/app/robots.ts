import type { MetadataRoute } from "next";
import { siteUrl } from "@/modules/seo/site";

export default function robots(): MetadataRoute.Robots {
  const enabled = process.env.SEO_INDEXING_ENABLED === "true";
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
