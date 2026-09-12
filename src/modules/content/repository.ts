import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { getServerEnv } from "@/lib/env/server";
import { getDemoCatalogue } from "@/modules/catalog/demo";
import { homepageDefaults, homepageSchema, type Homepage } from "./schema";
import { resolveHomepage } from "./fallback";

let lastKnownHomepage: Homepage | null = null;
const read = unstable_cache(
  async () => {
    const client = createPublicSupabaseClient();
    const [content, products, collections] = await Promise.all([
      client.from("homepage_content").select().single(),
      client.from("homepage_products").select().order("sort_order"),
      client.from("homepage_collections").select().order("sort_order"),
    ]);
    if (content.error || products.error || collections.error) {
      console.error(
        JSON.stringify({
          event: "homepage_read_failed",
          content: content.error?.code ?? null,
          products: products.error?.code ?? null,
          collections: collections.error?.code ?? null,
        }),
      );
      throw new Error("Homepage content could not be loaded.");
    }
    return homepageSchema.parse({
      ...content.data,
      product_ids: products.data.map((p) => p.product_id),
      collection_ids: collections.data.map((c) => c.collection_id),
    });
  },
  ["homepage-v1"],
  { tags: ["content"], revalidate: 60 },
);
export const getHomepage = cache(async () => {
  if (getServerEnv().CATALOG_SOURCE === "demo") {
    const c = getDemoCatalogue();
    return {
      ...homepageDefaults,
      product_ids: c.products
        .filter((p) => p.featured)
        .slice(0, 4)
        .map((p) => p.id),
      collection_ids: c.collections.map((c) => c.id),
    };
  }
  const result = await resolveHomepage(read, lastKnownHomepage);
  if (result.fallbackUsed)
    console.warn(
      "[content] Homepage configuration is temporarily unavailable; using the last known content or built-in fallback.",
    );
  else lastKnownHomepage = result.value;
  return result.value;
});
