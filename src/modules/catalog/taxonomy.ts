import type { Catalogue, Collection, Product } from "./schema";

export type ProductTypeChoice = {
  value: string;
  label: string;
  collectionSlugs: string[];
};

export function storefrontCollections(collections: Collection[]) {
  return collections.filter((collection) => collection.kind === "collection");
}

export function productTypeChoices(
  catalogue: Catalogue,
  products: Product[] = catalogue.products,
): ProductTypeChoice[] {
  const usedSlugs = new Set(products.flatMap((product) => product.collections));
  const grouped = new Map<string, ProductTypeChoice>();

  for (const collection of catalogue.collections) {
    if (
      collection.kind !== "product_type" ||
      !collection.product_type_key ||
      !usedSlugs.has(collection.slug)
    )
      continue;

    const current = grouped.get(collection.product_type_key);
    if (current) current.collectionSlugs.push(collection.slug);
    else
      grouped.set(collection.product_type_key, {
        value: collection.product_type_key,
        label: collection.name,
        collectionSlugs: [collection.slug],
      });
  }

  return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label));
}
