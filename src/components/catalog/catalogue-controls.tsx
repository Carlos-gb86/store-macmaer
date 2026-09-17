"use client";

import { Fragment } from "react";
import type { CatalogueQuery } from "@/modules/catalog/query";
import type { ProductTypeChoice } from "@/modules/catalog/taxonomy";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";

type Choice = { value: string; label: string };

export function CatalogueControls({
  query,
  onChange,
  collections,
  productTypes,
  tags,
  hideCollection = false,
}: {
  query: CatalogueQuery;
  onChange: (query: CatalogueQuery) => void;
  collections: Choice[];
  productTypes: ProductTypeChoice[];
  tags: Choice[];
  hideCollection?: boolean;
}) {
  const { t } = useStorefrontI18n();
  const change = <Key extends keyof CatalogueQuery>(
    name: Key,
    value: CatalogueQuery[Key],
  ) => onChange({ ...query, [name]: value });

  return (
    <form
      className="catalogue-controls"
      role="search"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="search-field">
        <label htmlFor="catalogue-search">{t("findPiece")}</label>
        <input
          id="catalogue-search"
          type="search"
          name="q"
          value={query.q}
          placeholder={t("searchPlaceholder")}
          maxLength={120}
          autoComplete="off"
          onChange={(event) => change("q", event.target.value)}
        />
      </div>
      {!hideCollection && (
        <div>
          <label htmlFor="collection-filter">{t("collection")}</label>
          <StorefrontSelect
            id="collection-filter"
            value={query.collection}
            options={[
              { value: "", label: t("allCollections") },
              ...collections,
            ]}
            onValueChange={(value) => change("collection", value)}
          />
        </div>
      )}
      <div>
        <label htmlFor="tag-filter">{t("details")}</label>
        <StorefrontSelect
          id="tag-filter"
          value={query.tag}
          options={[{ value: "", label: t("allDetails") }, ...tags]}
          onValueChange={(value) => change("tag", value)}
        />
      </div>
      <div>
        <label htmlFor="availability-filter">{t("availability")}</label>
        <StorefrontSelect
          id="availability-filter"
          value={query.availability}
          options={[
            { value: "", label: t("allProducts") },
            { value: "available", label: t("available") },
            { value: "made-to-order", label: t("madeToOrder") },
          ]}
          onValueChange={(value) =>
            change("availability", value as CatalogueQuery["availability"])
          }
        />
      </div>
      <div>
        <label htmlFor="sort">{t("sortBy")}</label>
        <StorefrontSelect
          id="sort"
          value={query.sort}
          options={[
            { value: "featured", label: t("featured") },
            { value: "newest", label: t("newest") },
            { value: "price-asc", label: t("priceLowHigh") },
            { value: "price-desc", label: t("priceHighLow") },
          ]}
          onValueChange={(value) =>
            change("sort", value as CatalogueQuery["sort"])
          }
        />
      </div>
      {productTypes.length > 0 && (
        <fieldset className="product-type-filter">
          <legend>{t("productType")}</legend>
          <div className="product-type-options">
            <button
              type="button"
              className="product-type-option"
              aria-pressed={query.type === ""}
              onClick={() => change("type", "")}
            >
              {t("all")}
            </button>
            {productTypes.map((type) => (
              <Fragment key={type.value}>
                <span className="product-type-separator" aria-hidden="true" />
                <button
                  type="button"
                  className="product-type-option"
                  aria-pressed={query.type === type.value}
                  onClick={() => change("type", type.value)}
                >
                  {type.label}
                </button>
              </Fragment>
            ))}
          </div>
        </fieldset>
      )}
    </form>
  );
}
