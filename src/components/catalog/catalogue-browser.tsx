"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Catalogue } from "@/modules/catalog/schema";
import {
  catalogueQueryHref,
  searchCatalogue,
  type CatalogueQuery,
} from "@/modules/catalog/query";
import type { ProductTypeChoice } from "@/modules/catalog/taxonomy";
import type { PricingContext } from "@/modules/currency/schema";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";
import { ExternalArrow } from "@/components/ui/external-arrow";
import { CatalogueControls } from "./catalogue-controls";
import { ProductCard } from "./product-card";

type Choice = { value: string; label: string };

export function CatalogueBrowser({
  data,
  initialQuery,
  path,
  fixedCollection,
  collections,
  productTypes,
  tags,
  pricing,
  locale,
}: {
  data: Catalogue;
  initialQuery: CatalogueQuery;
  path: string;
  fixedCollection?: string;
  collections: Choice[];
  productTypes: ProductTypeChoice[];
  tags: Choice[];
  pricing: PricingContext;
  locale: StorefrontLocale;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => searchCatalogue(data, deferredQuery),
    [data, deferredQuery],
  );
  const t = storefrontMessages[locale];

  const updateQuery = (next: CatalogueQuery) => {
    setQuery(next);
    window.history.replaceState(
      null,
      "",
      catalogueQueryHref(path, next, fixedCollection),
    );
  };

  const clearFilters = () =>
    updateQuery({
      q: "",
      collection: fixedCollection ?? "",
      type: "",
      tag: "",
      availability: "",
      sort: "featured",
    });

  return (
    <>
      <CatalogueControls
        query={query}
        onChange={updateQuery}
        hideCollection={Boolean(fixedCollection)}
        collections={collections}
        productTypes={productTypes}
        tags={tags}
      />
      <div className="results-summary" aria-live="polite">
        <p>
          {results.total} {results.total === 1 ? t.piece : t.pieces}
          {deferredQuery.q ? ` ${t.matching} “${deferredQuery.q}”` : ""}
        </p>
        <button type="button" onClick={clearFilters}>
          {t.clearFilters}
        </button>
      </div>
      {results.products.length ? (
        <div className="product-grid">
          {results.products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              pricing={pricing}
              priority={index < 2}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t.noPieces}</h2>
          <p>{t.tryAnother}</p>
          <button className="text-link" type="button" onClick={clearFilters}>
            {t.exploreAll} <ExternalArrow />
          </button>
        </div>
      )}
    </>
  );
}
