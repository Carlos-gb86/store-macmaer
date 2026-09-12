import type { NextConfig } from "next";
import legacyRedirects from "./config/legacy-redirects.json";

const remotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [];
const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (storageUrl) {
  const url = new URL(storageUrl);
  remotePatterns.push({
    protocol: url.protocol === "https:" ? "https" : "http",
    hostname: url.hostname,
    port: url.port,
    pathname: "/storage/v1/object/public/catalogue/**",
  });
}
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  images: {
    remotePatterns,
    dangerouslyAllowLocalIP:
      process.env.NODE_ENV === "development" &&
      !!storageUrl &&
      new URL(storageUrl).hostname === "127.0.0.1",
  },
  poweredByHeader: false,
  async redirects() {
    return [
      ...legacyRedirects.map((entry) => ({ ...entry, permanent: true })),
      {
        source: "/product/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        source: "/product-tag/:slug",
        destination: "/shop?tag=:slug",
        permanent: true,
      },
      {
        source: "/product-category/:collection/:rest*",
        destination: "/collections/:collection",
        permanent: true,
      },
    ];
  },
};
export default config;
