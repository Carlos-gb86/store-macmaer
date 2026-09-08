import Link from "next/link";
import type { Catalogue as CatalogueData } from "@/modules/catalog/schema";
import {
  parseCatalogueQuery,
  queryHref,
  searchCatalogue,
  type SearchParams,
} from "@/modules/catalog/query";
import { ProductCard } from "./product-card";
import { Button } from "@/components/ui/button";
import type { PricingContext } from "@/modules/currency/schema";
export function Catalogue({
  data,
  params,
  pricing,
  collection,
}: {
  data: CatalogueData;
  params: SearchParams;
  pricing: PricingContext;
  collection?: string;
}) {
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
      <form action={path} className="catalogue-controls" role="search">
        <div className="search-field">
          <label htmlFor="catalogue-search">Find your piece</label>
          <input
            id="catalogue-search"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Search textures, shapes, colours…"
            maxLength={120}
          />
        </div>
        {!collection && (
          <div>
            <label htmlFor="collection-filter">Collection</label>
            <select
              id="collection-filter"
              name="collection"
              defaultValue={query.collection}
            >
              <option value="">All collections</option>
              {data.collections.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="tag-filter">Details</label>
          <select id="tag-filter" name="tag" defaultValue={query.tag}>
            <option value="">All details</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="availability-filter">Availability</label>
          <select
            id="availability-filter"
            name="availability"
            defaultValue={query.availability}
          >
            <option value="">All pieces</option>
            <option value="available">Available</option>
            <option value="made-to-order">Made to order</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort">Sort by</label>
          <select name="sort" id="sort" defaultValue={query.sort}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Base price: low to high</option>
            <option value="price-desc">Base price: high to low</option>
          </select>
        </div>
        <Button type="submit">Apply</Button>
      </form>
      <div className="results-summary">
        <p>
          {results.total} {results.total === 1 ? "piece" : "pieces"}
          {query.q ? " matching “" + query.q + "”" : ""}
        </p>
        <Link href={path}>Clear filters</Link>
      </div>
      {results.products.length ? (
        <div className="product-grid">
          {results.products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              pricing={pricing}
              priority={index < 2}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No pieces found</h2>
          <p>Try another search or explore the full collection.</p>
          <Link className="text-link" href={path}>
            Explore all pieces →
          </Link>
        </div>
      )}
      {results.totalPages > 1 && (
        <nav className="pagination" aria-label="Catalogue pages">
          {results.page > 1 && (
            <Link href={queryHref(path, query, results.page - 1)}>
              ← Previous
            </Link>
          )}
          <span>
            Page {results.page} of {results.totalPages}
          </span>
          {results.page < results.totalPages && (
            <Link href={queryHref(path, query, results.page + 1)}>Next →</Link>
          )}
        </nav>
      )}
    </>
  );
}
