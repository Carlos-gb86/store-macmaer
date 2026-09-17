import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getServerEnv } from "@/lib/env/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { catalogueSchema } from "./schema";
import { getDemoCatalogue } from "./demo";

const readSupabaseCatalogue = unstable_cache(
  async () => {
    const client = createPublicSupabaseClient();
    // Read in bounded pages so PostgREST's row limit cannot silently truncate the catalogue.
    const products: unknown[] = [];
    const collections: unknown[] = [];
    const tagDefinitions: unknown[] = [];
    for (let from = 0; ; from += 100) {
      const { data, error } = await client
        .from("catalogue_products")
        .select("document")
        .order("id")
        .range(from, from + 99);
      if (error) throw new Error("Catalogue could not be loaded.");
      products.push(...data.map((row) => row.document));
      if (data.length < 100) break;
    }
    for (let from = 0; ; from += 100) {
      const { data, error } = await client
        .from("collections")
        .select("*")
        .order("sort_order")
        .order("id")
        .range(from, from + 99);
      if (error) throw new Error("Collections could not be loaded.");
      collections.push(...data);
      if (data.length < 100) break;
    }
    for (let from = 0; ; from += 100) {
      const { data, error } = await client
        .from("tags")
        .select("id,slug,name,name_sv")
        .order("name")
        .range(from, from + 99);
      if (error) throw new Error("Catalogue tags could not be loaded.");
      tagDefinitions.push(...data);
      if (data.length < 100) break;
    }
    return catalogueSchema.parse({ products, collections, tagDefinitions });
  },
  ["public-catalogue-v2"],
  { revalidate: 60, tags: ["catalogue"] },
);

export const getCatalogue = cache(async () => {
  return getServerEnv().CATALOG_SOURCE === "demo"
    ? getDemoCatalogue()
    : readSupabaseCatalogue();
});
export async function getProduct(slug: string) {
  return (await getCatalogue()).products.find(
    (product) => product.slug === slug,
  );
}
export async function getCollection(slug: string) {
  return (await getCatalogue()).collections.find(
    (collection) =>
      collection.kind === "collection" && collection.slug === slug,
  );
}
