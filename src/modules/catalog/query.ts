import { z } from "zod";
import type { Catalogue, Product } from "./schema";
import { availableConfigurations } from "./selection";
import { calculateProductStartingPrice } from "@/modules/pricing/calculate";
import { productTypeChoices } from "./taxonomy";
export const catalogueQuerySchema = z.object({
  q: z.string().trim().max(120).catch(""),
  collection: z.string().max(80).catch(""),
  type: z.string().max(80).catch(""),
  tag: z.string().max(80).catch(""),
  availability: z.enum(["", "available", "made-to-order"]).catch(""),
  sort: z
    .enum(["featured", "newest", "price-asc", "price-desc"])
    .catch("featured"),
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
function normalizeSearch(value: string) {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchCatalogue(catalogue: Catalogue, query: CatalogueQuery) {
  const needles = normalizeSearch(query.q).split(" ").filter(Boolean);
  const types = new Map(
    productTypeChoices(catalogue).map((type) => [
      type.value,
      new Set(type.collectionSlugs),
    ]),
  );
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
    ].join(" ");
    const normalizedSearchable = normalizeSearch(searchable);
    const selectedType = types.get(query.type);
    return (
      product.status === "active" &&
      needles.every((needle) => normalizedSearchable.includes(needle)) &&
      (!query.collection || product.collections.includes(query.collection)) &&
      (!query.type ||
        (selectedType !== undefined &&
          product.collections.some((slug) => selectedType.has(slug)))) &&
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
  return {
    products,
    total: products.length,
  };
}

export function catalogueQueryHref(
  path: string,
  query: CatalogueQuery,
  fixedCollection?: string,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === "" || (key === "sort" && value === "featured")) continue;
    if (key === "collection" && value === fixedCollection) continue;
    params.set(key, String(value));
  }
  return params.size ? `${path}?${params}` : path;
}
