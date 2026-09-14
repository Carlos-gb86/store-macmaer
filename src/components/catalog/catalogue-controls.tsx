"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CatalogueQuery } from "@/modules/catalog/query";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";

type Choice = { value: string; label: string };

export function CatalogueControls({
  path,
  query,
  collections,
  tags,
  hideCollection = false,
}: {
  path: string;
  query: CatalogueQuery;
  collections: Choice[];
  tags: Choice[];
  hideCollection?: boolean;
}) {
  const router = useRouter();
  const { t } = useStorefrontI18n();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(query);
  const firstRender = useRef(true);

  const navigate = (next: CatalogueQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...next, page: 1 })) {
      if (value !== "" && !(key === "sort" && value === "featured"))
        params.set(key, String(value));
    }
    startTransition(() => {
      router.replace(params.size ? `${path}?${params}` : path, {
        scroll: false,
      });
    });
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => navigate(values), 320);
    return () => window.clearTimeout(timer);
    // Only the search field is intentionally debounced. Select controls call
    // navigate directly from their change handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.q]);

  const changeSelect = (
    name: "collection" | "tag" | "availability" | "sort",
    value: string,
  ) => {
    const next = { ...values, [name]: value, page: 1 } as CatalogueQuery;
    setValues(next);
    navigate(next);
  };

  return (
    <form
      action={path}
      className="catalogue-controls"
      role="search"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(values);
      }}
    >
      <div className="search-field">
        <label htmlFor="catalogue-search">{t("findPiece")}</label>
        <input
          id="catalogue-search"
          type="search"
          name="q"
          value={values.q}
          placeholder={t("searchPlaceholder")}
          maxLength={120}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              q: event.target.value,
              page: 1,
            }))
          }
        />
      </div>
      {!hideCollection && (
        <div>
          <label htmlFor="collection-filter">{t("collection")}</label>
          <StorefrontSelect
            id="collection-filter"
            value={values.collection}
            options={[
              { value: "", label: t("allCollections") },
              ...collections,
            ]}
            onValueChange={(value) => changeSelect("collection", value)}
          />
        </div>
      )}
      <div>
        <label htmlFor="tag-filter">{t("details")}</label>
        <StorefrontSelect
          id="tag-filter"
          value={values.tag}
          options={[{ value: "", label: t("allDetails") }, ...tags]}
          onValueChange={(value) => changeSelect("tag", value)}
        />
      </div>
      <div>
        <label htmlFor="availability-filter">{t("availability")}</label>
        <StorefrontSelect
          id="availability-filter"
          value={values.availability}
          options={[
            { value: "", label: t("allProducts") },
            { value: "available", label: t("available") },
            { value: "made-to-order", label: t("madeToOrder") },
          ]}
          onValueChange={(value) => changeSelect("availability", value)}
        />
      </div>
      <div>
        <label htmlFor="sort">{t("sortBy")}</label>
        <StorefrontSelect
          id="sort"
          value={values.sort}
          options={[
            { value: "featured", label: t("featured") },
            { value: "newest", label: t("newest") },
            { value: "price-asc", label: t("priceLowHigh") },
            { value: "price-desc", label: t("priceHighLow") },
          ]}
          onValueChange={(value) => changeSelect("sort", value)}
        />
      </div>
      <span className="catalogue-update-status" aria-live="polite">
        {pending ? t("updatingResults") : ""}
      </span>
    </form>
  );
}
