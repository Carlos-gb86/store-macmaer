import { z } from "zod";
import type { Catalogue, Product } from "./schema";
import { availableConfigurations } from "./selection";
import { calculateProductStartingPrice } from "@/modules/pricing/calculate";
export const catalogueQuerySchema = z.object({
  q: z.string().trim().max(120).catch(""),
  collection: z.string().max(80).catch(""),
  tag: z.string().max(80).catch(""),
  availability: z.enum(["", "available", "made-to-order"]).catch(""),
  sort: z
    .enum(["featured", "newest", "price-asc", "price-desc"])
    .catch("featured"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});
export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;
export type SearchParams = Record<string, string | string[] | undefined>;
export function parseCatalogueQuery(params: SearchParams): CatalogueQuery {
  return catalogueQuerySchema.parse(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    ),
  );
}
export const PAGE_SIZE = 12;
export function searchCatalogue(catalogue: Catalogue, query: CatalogueQuery) {
  const needle = query.q.toLocaleLowerCase("en");
  const products = catalogue.products.filter((product) => {
    const collectionNames = catalogue.collections
      .filter((c) => product.collections.includes(c.slug))
      .map((c) => c.name);
    const searchable = [
      product.title,
      product.short_description,
      product.description,
      ...product.tags,
      ...collectionNames,
    ]
      .join(" ")
      .toLocaleLowerCase("en");
    return (
      product.status === "active" &&
      (!needle || searchable.includes(needle)) &&
      (!query.collection || product.collections.includes(query.collection)) &&
      (!query.tag || product.tags.includes(query.tag)) &&
      (query.availability !== "available" ||
        availableConfigurations(product).length > 0) &&
      (query.availability !== "made-to-order" ||
        availableConfigurations(product).some(
          (item) => item.inventory_strategy === "MADE_TO_ORDER",
        ))
    );
  });
  // All catalogue products are canonical SEK; conversion is monotonic, so sort exact
  // purchasable starting prices before applying the selected display currency.
  const sorters: Record<
    CatalogueQuery["sort"],
    (a: Product, b: Product) => number
  > = {
    featured: (a, b) =>
      Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order,
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
    "price-asc": (a, b) =>
      calculateProductStartingPrice(a) - calculateProductStartingPrice(b),
    "price-desc": (a, b) =>
      calculateProductStartingPrice(b) - calculateProductStartingPrice(a),
  };
  products.sort(
    (a, b) => sorters[query.sort](a, b) || a.slug.localeCompare(b.slug),
  );
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  return {
    products: products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: products.length,
    page,
    totalPages,
  };
}
export function queryHref(path: string, query: CatalogueQuery, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page }))
    if (value !== "") params.set(key, String(value));
  return path + "?" + params.toString();
}
