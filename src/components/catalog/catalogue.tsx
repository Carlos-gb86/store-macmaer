import Link from "next/link";
import type { Catalogue as CatalogueData } from "@/modules/catalog/schema";
import {
  parseCatalogueQuery,
  queryHref,
  searchCatalogue,
  type SearchParams,
} from "@/modules/catalog/query";
import { ProductCard } from "./product-card";
import type { PricingContext } from "@/modules/currency/schema";
import { CatalogueControls } from "./catalogue-controls";
import { ExternalArrow } from "@/components/ui/external-arrow";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";
export function Catalogue({
  data,
  params,
  pricing,
  collection,
  locale,
}: {
  data: CatalogueData;
  params: SearchParams;
  pricing: PricingContext;
  collection?: string;
  locale: StorefrontLocale;
}) {
  const t = storefrontMessages[locale];
  const query = parseCatalogueQuery({
    ...params,
    ...(collection ? { collection } : {}),
  });
  const results = searchCatalogue(data, query);
  const path = collection ? "/collections/" + collection : "/shop";
  const tags = [
    ...new Set(
      data.products
        .filter((p) => !collection || p.collections.includes(collection))
        .flatMap((p) => p.tags),
    ),
  ].sort();
  return (
    <>
      <CatalogueControls
        key={JSON.stringify(query)}
        path={path}
        query={query}
        hideCollection={Boolean(collection)}
        collections={data.collections.map((item) => ({
          value: item.slug,
          label: item.name,
        }))}
        tags={tags.map((tag) => ({
          value: tag,
          label:
            data.tagDefinitions.find((definition) => definition.slug === tag)
              ?.name ?? tag.replaceAll("-", " "),
        }))}
      />
      <div className="results-summary">
        <p>
          {results.total} {results.total === 1 ? t.piece : t.pieces}
          {query.q ? ` ${t.matching} “${query.q}”` : ""}
        </p>
        <Link href={path}>{t.clearFilters}</Link>
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
          <Link className="text-link" href={path}>
            {t.exploreAll} <ExternalArrow />
          </Link>
        </div>
      )}
      {results.totalPages > 1 && (
        <nav
          className="pagination"
          aria-label={locale === "sv" ? "Katalogsidor" : "Catalogue pages"}
        >
          {results.page > 1 && (
            <Link href={queryHref(path, query, results.page - 1)}>
              ← {t.previous}
            </Link>
          )}
          <span>
            {t.page} {results.page} {t.of} {results.totalPages}
          </span>
          {results.page < results.totalPages && (
            <Link href={queryHref(path, query, results.page + 1)}>
              {t.next} →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
