"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/modules/admin/actions";
import { duplicateProduct, type ProductInput } from "@/modules/admin/schema";
import type { MutationResult } from "@/modules/admin/result";
import type { MediaItem } from "@/modules/admin/media";
import { Field, Result, useEditorReady } from "./fields";
import { OptionsEditor } from "./options-editor";
import { VariantsEditor, inventoryChoices } from "./variants-editor";
import { GalleryEditor } from "./gallery-editor";
import { TagDialogButton } from "./tag-editor";
import { RichEditor } from "./rich-editor";
import { textDocument } from "@/modules/content/rich-text";
import { TagSelector } from "./tag-selector";
export function ProductEditor({
  initial,
  collections,
  tags,
  taxCategories,
  shippingClasses,
  media,
}: {
  initial: ProductInput;
  collections: { slug: string; name: string; name_sv: string | null }[];
  tags: { slug: string; name: string; name_sv: string | null }[];
  taxCategories: { key: string; name: string }[];
  shippingClasses: { key: string; name: string }[];
  media: MediaItem[];
}) {
  const [p, setP] = useState(initial),
    [addedTags, setAddedTags] = useState<
      { slug: string; name: string; name_sv: string | null }[]
    >([]),
    [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition(),
    router = useRouter();
  const ready = useEditorReady();
  const set = (key: keyof ProductInput, value: unknown) =>
    setP((p) => ({ ...p, [key]: value }));
  const save = (status = p.status) => {
    setResult(null);
    start(async () => {
      const next = {
        ...p,
        status,
        images: p.images.map((v, i) => ({ ...v, sort_order: i })),
        options: p.options.map((o, i) => ({
          ...o,
          sort_order: i,
          values: o.values.map((v, j) => ({ ...v, sort_order: j })),
        })),
        variants: p.variants.map((v, i) => ({ ...v, sort_order: i })),
      };
      const r = await saveProduct(next);
      setResult(r);
      if (r.ok) {
        setP({ ...next, updated_at: r.data.updated_at! });
        if (!p.updated_at) router.replace("/admin/products/" + p.id);
        router.refresh();
      }
    });
  };
  if (!ready) return <p role="status">Loading product editor…</p>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Link className="back-link" href="/admin/products">
        ← All products
      </Link>
      <h1>{p.title || "New product"}</h1>
      <p>
        Status:{" "}
        <strong className={"status-badge " + p.status}>{p.status}</strong> ·
        Prices in SEK. Save an active product to update it immediately.
      </p>
      <nav className="editor-jump" aria-label="Product sections">
        <a href="#product-details">Details</a>
        <a href="#product-pricing">Price & fulfilment</a>
        <a href="#product-options">Options</a>
        <a href="#product-variants">Variants</a>
        <a href="#product-gallery">Images</a>
      </nav>
      <fieldset className="editor-lock" disabled={pending}>
        <fieldset id="product-details">
          <legend>Product details</legend>
          <div className="admin-grid">
            {(
              [
                "title",
                "slug",
                "subtitle",
                "sku",
                "short_description",
                "materials",
                "care",
              ] as const
            ).map((k) => (
              <Field
                key={k}
                label={k.replaceAll("_", " ")}
                value={p[k]}
                nullable={[
                  "subtitle",
                  "sku",
                  "processing_time",
                  "seo_title",
                  "seo_description",
                ].includes(k)}
                multiline={[
                  "short_description",
                  "materials",
                  "care",
                  "seo_description",
                ].includes(k)}
                onChange={(v) => set(k, v)}
              />
            ))}
          </div>
          <RichEditor
            disabled={pending}
            value={p.description_document ?? textDocument(p.description)}
            onChange={(v) => set("description_document", v)}
          />
        </fieldset>
        <fieldset>
          <legend>Swedish storefront copy</legend>
          <p className="section-intro">
            Optional. Any empty Swedish field automatically uses its English
            value, so partial translations are safe to publish.
          </p>
          <div className="admin-grid">
            <Field
              label="Swedish title"
              value={p.title_sv ?? null}
              nullable
              onChange={(value) => set("title_sv", value)}
            />
            <Field
              label="Swedish subtitle"
              value={p.subtitle_sv ?? null}
              nullable
              onChange={(value) => set("subtitle_sv", value)}
            />
            <Field
              label="Swedish short description"
              value={p.short_description_sv ?? null}
              nullable
              multiline
              onChange={(value) => set("short_description_sv", value)}
            />
            <Field
              label="Swedish materials"
              value={p.materials_sv ?? null}
              nullable
              multiline
              onChange={(value) => set("materials_sv", value)}
            />
            <Field
              label="Swedish care instructions"
              value={p.care_sv ?? null}
              nullable
              multiline
              onChange={(value) => set("care_sv", value)}
            />
            <Field
              label="Swedish processing time"
              value={p.processing_time_sv ?? null}
              nullable
              onChange={(value) => set("processing_time_sv", value)}
            />
          </div>
          <RichEditor
            label="Swedish full description"
            disabled={pending}
            value={
              p.description_document_sv ?? textDocument(p.description_sv ?? "")
            }
            onChange={(value) => set("description_document_sv", value)}
          />
        </fieldset>
        <fieldset id="product-pricing">
          <legend>Price, stock & fulfilment</legend>
          <h3>Pricing</h3>
          <p className="field-note">All prices are entered in SEK.</p>
          <div className="admin-grid">
            <Field
              label="Base price (SEK)"
              value={p.base_price}
              onChange={(v) => set("base_price", v)}
            />
            <Field
              label="Compare-at price (SEK, optional)"
              help="The previous or regular price shown alongside the selling price. Leave blank when there is no comparison price."
              value={p.compare_at_price}
              onChange={(v) => set("compare_at_price", v)}
            />
          </div>
          <h3 className="subsection-heading">Availability</h3>
          <div className="admin-grid">
            <Field
              label="Inventory strategy"
              help="Track stock for a limited quantity, choose made to order for items you make after purchase, or always available when stock is unlimited."
              value={p.inventory_strategy}
              options={inventoryChoices}
              onChange={(v) =>
                setP({
                  ...p,
                  inventory_strategy: v as ProductInput["inventory_strategy"],
                  stock_quantity:
                    v === "TRACKED" ? (p.stock_quantity ?? 0) : null,
                })
              }
            />
            {p.inventory_strategy === "TRACKED" && (
              <Field
                label="Stock quantity"
                value={p.stock_quantity}
                numeric
                nullable
                onChange={(v) => set("stock_quantity", v)}
              />
            )}
            <Field
              label="Processing time"
              value={p.processing_time}
              nullable
              placeholder="e.g. Made in 3–5 working days"
              onChange={(v) => set("processing_time", v)}
            />
          </div>
          <h3 className="subsection-heading">Shipping details & returns</h3>
          <div className="admin-grid">
            <Field
              label="Weight (grams)"
              value={p.weight_grams}
              numeric
              nullable
              onChange={(v) => set("weight_grams", v)}
            />
            <Field
              label="Return classification"
              value={p.return_policy_class}
              options={["standard", "customized", "final_sale"]}
              onChange={(v) => set("return_policy_class", v)}
            />
            <Field
              label="Tax category"
              value={p.tax_category_key}
              options={taxCategories.map((item) => item.key)}
              onChange={(v) => set("tax_category_key", v)}
            />
            <Field
              label="Shipping package class"
              value={p.shipping_class_key}
              options={shippingClasses.map((item) => item.key)}
              onChange={(v) => set("shipping_class_key", v)}
            />
            {(["length_cm", "width_cm", "height_cm"] as const).map((k) => (
              <Field
                key={k}
                label={k.replaceAll("_", " ")}
                value={p.dimensions[k]}
                numeric
                nullable
                onChange={(v) => {
                  const dimensions = { ...p.dimensions };
                  if (v === null) delete dimensions[k];
                  else dimensions[k] = Number(v);
                  set("dimensions", dimensions);
                }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Collections and tags</legend>
          <div className="admin-grid product-taxonomy-grid">
            <div>
              <h3>Collections</h3>
              {collections.map((item) => (
                <Field
                  key={item.slug}
                  label={item.name}
                  value={p.collections.includes(item.slug)}
                  onChange={(checked) =>
                    set(
                      "collections",
                      checked
                        ? [...p.collections, item.slug]
                        : p.collections.filter((slug) => slug !== item.slug),
                    )
                  }
                />
              ))}
            </div>
            <div>
              <div className="admin-taxonomy-heading">
                <h3>Tags</h3>
                <TagDialogButton
                  onCreated={(tag) => {
                    setAddedTags((items) => [...items, tag]);
                    setP((current) => ({
                      ...current,
                      tags: [...new Set([...current.tags, tag.slug])],
                    }));
                  }}
                />
              </div>
              <TagSelector
                tags={[
                  ...new Map(
                    [...tags, ...addedTags].map((tag) => [tag.slug, tag]),
                  ).values(),
                ]}
                selected={p.tags}
                onChange={(value) => set("tags", value)}
              />
            </div>
          </div>
        </fieldset>
        <OptionsEditor
          key={p.id + "-options"}
          options={p.options}
          media={media}
          onChange={(v) => set("options", v)}
        />
        <VariantsEditor
          key={p.id + "-variants"}
          product={p}
          onChange={(v) => set("variants", v)}
        />
        <GalleryEditor
          images={p.images}
          variants={p.variants}
          media={media}
          onChange={(v) =>
            setP((current) => ({
              ...current,
              images: typeof v === "function" ? v(current.images) : v,
            }))
          }
        />
        <details className="admin-disclosure">
          <summary>Search engine listing</summary>
          <div className="admin-grid">
            <Field
              label="SEO title"
              value={p.seo_title}
              nullable
              onChange={(v) => set("seo_title", v)}
              help="Optional. Leave blank to use the product title."
            />
            <Field
              label="SEO description"
              value={p.seo_description}
              nullable
              multiline
              onChange={(v) => set("seo_description", v)}
              help="A short summary for search results."
            />
            <Field
              label="Swedish SEO title"
              value={p.seo_title_sv ?? null}
              nullable
              onChange={(v) => set("seo_title_sv", v)}
            />
            <Field
              label="Swedish SEO description"
              value={p.seo_description_sv ?? null}
              nullable
              multiline
              onChange={(v) => set("seo_description_sv", v)}
            />
          </div>
        </details>
      </fieldset>
      <div className="admin-save">
        <p className="field-note">
          {pending
            ? "Saving your changes…"
            : "Save to apply your changes. Preview shows the last saved version."}
        </p>
        <Result result={result} />
        <div className="admin-actions">
          <button disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          {p.status !== "active" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save("active")}
            >
              Publish product
            </button>
          )}
          {p.status !== "archived" && p.updated_at && (
            <button
              type="button"
              className="secondary"
              disabled={pending}
              onClick={() => save("archived")}
            >
              Archive
            </button>
          )}
          {p.status === "archived" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save("draft")}
            >
              Restore to draft
            </button>
          )}
          {p.updated_at && (
            <>
              <Link
                href={"/admin/products/" + p.id + "/preview"}
                target="_blank"
              >
                Preview saved product
              </Link>
              <button
                type="button"
                className="secondary"
                disabled={pending}
                onClick={() => {
                  setP(duplicateProduct(p));
                  setResult(null);
                  window.scrollTo(0, 0);
                }}
              >
                Duplicate as draft
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
