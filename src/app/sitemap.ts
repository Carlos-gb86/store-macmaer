import type { MetadataRoute } from "next";
import { getCatalogue } from "@/modules/catalog/repository";
import { siteUrl } from "@/modules/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    ["/", "weekly", 1],
    ["/shop", "weekly", 0.9],
    ["/collections", "weekly", 0.8],
    ["/contact", "yearly", 0.4],
  ].map(([path, changeFrequency, priority]) => ({
    url: siteUrl(String(path)),
    changeFrequency: changeFrequency as "weekly" | "yearly",
    priority: Number(priority),
  }));
  try {
    const catalogue = await getCatalogue();
    return [
      ...staticEntries,
      ...catalogue.collections
        .filter((collection) => collection.kind === "collection")
        .map((collection) => ({
          url: siteUrl(`/collections/${collection.slug}`),
          lastModified: collection.updated_at
            ? new Date(collection.updated_at)
            : undefined,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
      ...catalogue.products.map((product) => ({
        url: siteUrl(`/products/${product.slug}`),
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        images: product.images.map((image) =>
          absoluteUrl(resolveImageSafe(image.path)),
        ),
      })),
    ];
  } catch {
    console.error(JSON.stringify({ event: "sitemap_catalogue_failed" }));
    return staticEntries;
  }
}

function resolveImageSafe(path: string) {
  if (path.startsWith("/")) return path;
  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return storage
    ? `${storage}/storage/v1/object/public/catalogue/${path.split("/").map(encodeURIComponent).join("/")}`
    : path;
}

function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : siteUrl(path);
}
