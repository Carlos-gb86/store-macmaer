import type { Catalogue as CatalogueData } from "@/modules/catalog/schema";
import {
  parseCatalogueQuery,
  type SearchParams,
} from "@/modules/catalog/query";
import {
  productTypeChoices,
  storefrontCollections,
} from "@/modules/catalog/taxonomy";
import type { PricingContext } from "@/modules/currency/schema";
import type { StorefrontLocale } from "@/modules/i18n/config";
import type { ProductReviewSummaries } from "@/modules/reviews/repository";
import { CatalogueBrowser } from "./catalogue-browser";

export function Catalogue({
  data,
  params,
  pricing,
  collection,
  locale,
  reviewSummaries,
}: {
  data: CatalogueData;
  params: SearchParams;
  pricing: PricingContext;
  collection?: string;
  locale: StorefrontLocale;
  reviewSummaries: ProductReviewSummaries;
}) {
  const query = parseCatalogueQuery({
    ...params,
    ...(collection ? { collection } : {}),
  });
  const path = collection ? `/collections/${collection}` : "/shop";
  const scopedProducts = data.products.filter(
    (product) => !collection || product.collections.includes(collection),
  );
  const tags = [...new Set(scopedProducts.flatMap((product) => product.tags))]
    .sort()
    .map((tag) => ({
      value: tag,
      label:
        data.tagDefinitions.find((definition) => definition.slug === tag)
          ?.name ?? tag.replaceAll("-", " "),
    }));

  return (
    <CatalogueBrowser
      data={data}
      initialQuery={query}
      path={path}
      fixedCollection={collection}
      pricing={pricing}
      locale={locale}
      reviewSummaries={reviewSummaries}
      collections={storefrontCollections(data.collections).map((item) => ({
        value: item.slug,
        label: item.name,
      }))}
      productTypes={productTypeChoices(data, scopedProducts)}
      tags={tags}
    />
  );
}
