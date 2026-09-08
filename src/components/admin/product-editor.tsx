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
export function ProductEditor({
  initial,
  collections,
  tags,
  media,
}: {
  initial: ProductInput;
  collections: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
  media: MediaItem[];
}) {
  const [p, setP] = useState(initial),
    [addedTags, setAddedTags] = useState<{ slug: string; name: string }[]>([]),
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
          <div className="admin-grid">
            {(["collections", "tags"] as const).map((k) => (
              <div key={k}>
                <h3>{k}</h3>
                {k === "tags" && (
                  <TagDialogButton
                    onCreated={(tag) => {
                      setAddedTags((items) => [...items, tag]);
                      setP((current) => ({
                        ...current,
                        tags: [...new Set([...current.tags, tag.slug])],
                      }));
                    }}
                  />
                )}
                {(k === "collections"
                  ? collections
                  : [
                      ...new Map(
                        [...tags, ...addedTags].map((t) => [t.slug, t]),
                      ).values(),
                    ]
                ).map((item) => (
                  <Field
                    key={item.slug}
                    label={item.name}
                    value={p[k].includes(item.slug)}
                    onChange={(checked) =>
                      set(
                        k,
                        checked
                          ? [...p[k], item.slug]
                          : p[k].filter((s) => s !== item.slug),
                      )
                    }
                  />
                ))}
              </div>
            ))}
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
