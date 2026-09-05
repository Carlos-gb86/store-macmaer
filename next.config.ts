import type { NextConfig } from "next";

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
  images: { remotePatterns },
  poweredByHeader: false,
};
export default config;
