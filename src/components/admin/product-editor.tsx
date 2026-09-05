"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/modules/admin/actions";
import { duplicateProduct, type ProductInput } from "@/modules/admin/schema";
import type { MutationResult } from "@/modules/admin/result";
import type { MediaItem } from "@/modules/admin/media";
import { Field, Result, OrderButtons, move, useEditorReady } from "./fields";
import { MediaPicker, MediaUpload } from "./media-picker";
import { RichEditor } from "./rich-editor";
import { textDocument } from "@/modules/content/rich-text";
const inventory = [
  "TRACKED",
  "MADE_TO_ORDER",
  "UNLIMITED",
  "UNAVAILABLE",
] as const;
const types = [
  "select",
  "radio",
  "colour_swatch",
  "image_swatch",
  "checkbox",
  "short_text",
  "number",
  "repeated_select",
] as const;
type Option = ProductInput["options"][number];
type Variant = ProductInput["variants"][number];
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
    [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition(),
    router = useRouter();
  const ready = useEditorReady();
  const set = (key: keyof ProductInput, value: unknown) =>
    setP((p) => ({ ...p, [key]: value }));
  const option = (index: number, patch: Partial<Option>) =>
    setP((p) => ({
      ...p,
      options: p.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    }));
  const variant = (index: number, patch: Partial<Variant>) =>
    setP((p) => ({
      ...p,
      variants: p.variants.map((v, i) =>
        i === index ? { ...v, ...patch } : v,
      ),
    }));
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
      <h1>{p.title || "New product"}</h1>
      <p>
        Status: <strong>{p.status}</strong> · Prices in SEK. Save an active
        product to update it immediately.
      </p>
      <Result result={result} />
      <fieldset>
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
              "processing_time",
              "seo_title",
              "seo_description",
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
        <label>Description</label>
        <RichEditor
          value={p.description_document ?? textDocument(p.description)}
          onChange={(v) => set("description_document", v)}
        />
      </fieldset>
      <fieldset>
        <legend>Price, stock, and fulfilment</legend>
        <div className="admin-grid">
          <Field
            label="Base price (SEK)"
            value={p.base_price}
            onChange={(v) => set("base_price", v)}
          />
          <Field
            label="Compare-at price (SEK, optional)"
            value={p.compare_at_price}
            onChange={(v) => set("compare_at_price", v)}
          />
          <Field
            label="Inventory strategy"
            value={p.inventory_strategy}
            options={inventory}
            onChange={(v) => set("inventory_strategy", v)}
          />
          <Field
            label="Stock quantity"
            value={p.stock_quantity}
            numeric
            nullable
            onChange={(v) => set("stock_quantity", v)}
          />
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
              {(k === "collections" ? collections : tags).map((item) => (
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
      <fieldset>
        <legend>Options</legend>
        <p>
          Variant axes are required single selections. Repeated choices
          configure the product without generating SKU combinations.
        </p>
        {p.options.map((o, i) => (
          <fieldset key={o.id}>
            <legend>{o.label || "New option"}</legend>
            <div className="admin-actions">
              <OrderButtons
                index={i}
                length={p.options.length}
                onMove={(d) => set("options", move(p.options, i, d))}
              />
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  set(
                    "options",
                    p.options.filter((_, j) => i !== j),
                  )
                }
              >
                Remove option
              </button>
            </div>
            <div className="admin-grid">
              <Field
                label="Option key"
                value={o.key}
                onChange={(v) => option(i, { key: String(v) })}
              />
              <Field
                label="Option label"
                value={o.label}
                onChange={(v) => option(i, { label: String(v) })}
              />
              <Field
                label="Display type"
                value={o.display_type}
                options={types}
                onChange={(v) =>
                  option(i, { display_type: v as Option["display_type"] })
                }
              />
              {(
                [
                  "required",
                  "is_variant_axis",
                  "affects_price",
                  "affects_weight",
                  "allow_duplicates",
                ] as const
              ).map((k) => (
                <Field
                  key={k}
                  label={k.replaceAll("_", " ")}
                  value={o[k]}
                  onChange={(v) => option(i, { [k]: v })}
                />
              ))}
              {(
                ["min_selections", "max_selections", "repeat_count"] as const
              ).map((k) => (
                <Field
                  key={k}
                  label={k.replaceAll("_", " ")}
                  value={o[k]}
                  numeric
                  nullable={k === "max_selections"}
                  onChange={(v) => option(i, { [k]: v })}
                />
              ))}
              {(["max_length", "min", "max", "step"] as const).map((k) => (
                <Field
                  key={k}
                  label={"Validation " + k}
                  value={o.validation_rules[k]}
                  numeric
                  nullable
                  onChange={(v) => {
                    const rules = { ...o.validation_rules };
                    if (v === null) delete rules[k];
                    else rules[k] = Number(v);
                    option(i, { validation_rules: rules });
                  }}
                />
              ))}
            </div>
            {o.values.map((v, j) => (
              <div className="admin-card" key={v.id}>
                <div className="admin-grid">
                  {(
                    [
                      "key",
                      "label",
                      "colour_hex",
                      "price_delta",
                      "weight_delta_grams",
                      "active",
                    ] as const
                  ).map((k) => (
                    <Field
                      key={k}
                      label={"Value " + k.replaceAll("_", " ")}
                      value={v[k]}
                      numeric={k === "weight_delta_grams"}
                      nullable={k === "colour_hex"}
                      onChange={(value) =>
                        option(i, {
                          values: o.values.map((x, n) =>
                            n === j ? { ...x, [k]: value } : x,
                          ),
                        })
                      }
                    />
                  ))}
                  <MediaPicker
                    items={media}
                    value={v.asset_id}
                    label="Swatch image"
                    onChange={(id) =>
                      option(i, {
                        values: o.values.map((x, n) =>
                          n === j
                            ? {
                                ...x,
                                asset_id: id,
                                image_path: id ? x.image_path : null,
                              }
                            : x,
                        ),
                      })
                    }
                  />
                </div>
                <div className="admin-actions">
                  <OrderButtons
                    index={j}
                    length={o.values.length}
                    onMove={(d) => option(i, { values: move(o.values, j, d) })}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      option(i, { values: o.values.filter((_, n) => n !== j) })
                    }
                  >
                    Remove value
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                option(i, {
                  values: [
                    ...o.values,
                    {
                      id: crypto.randomUUID(),
                      key: "",
                      label: "",
                      colour_hex: null,
                      image_path: null,
                      asset_id: null,
                      price_delta: "0.00",
                      weight_delta_grams: 0,
                      active: true,
                      sort_order: o.values.length,
                    },
                  ],
                })
              }
            >
              Add value
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() =>
            set("options", [
              ...p.options,
              {
                id: crypto.randomUUID(),
                key: "",
                label: "",
                display_type: "select",
                required: true,
                is_variant_axis: false,
                affects_price: false,
                affects_weight: false,
                min_selections: 0,
                max_selections: null,
                repeat_count: 1,
                allow_duplicates: true,
                validation_rules: {},
                sort_order: p.options.length,
                values: [],
              },
            ])
          }
        >
          Add option
        </button>
      </fieldset>
      <fieldset>
        <legend>Variants</legend>
        {p.variants.map((v, i) => (
          <fieldset key={v.id}>
            <legend>{v.title || "New variant"}</legend>
            <div className="admin-grid">
              {(
                [
                  "sku",
                  "title",
                  "price_override",
                  "price_delta",
                  "compare_at_price",
                  "weight_override_grams",
                  "stock_quantity",
                  "active",
                ] as const
              ).map((k) => (
                <Field
                  key={k}
                  label={"Variant " + k.replaceAll("_", " ")}
                  value={v[k]}
                  numeric={["weight_override_grams", "stock_quantity"].includes(
                    k,
                  )}
                  nullable={[
                    "weight_override_grams",
                    "stock_quantity",
                  ].includes(k)}
                  onChange={(value) => variant(i, { [k]: value })}
                />
              ))}
              <Field
                label="Variant inventory strategy"
                value={v.inventory_strategy}
                options={inventory}
                onChange={(value) =>
                  variant(i, {
                    inventory_strategy: value as Variant["inventory_strategy"],
                  })
                }
              />
              {p.options
                .filter((o) => o.is_variant_axis)
                .map((o) => (
                  <label key={o.id}>
                    {o.label}
                    <select
                      value={
                        v.value_ids.find((id) =>
                          o.values.some((x) => x.id === id),
                        ) ?? ""
                      }
                      onChange={(e) =>
                        variant(i, {
                          value_ids: [
                            ...v.value_ids.filter(
                              (id) => !o.values.some((x) => x.id === id),
                            ),
                            ...(e.target.value ? [e.target.value] : []),
                          ],
                        })
                      }
                    >
                      <option value="">Choose a value</option>
                      {o.values
                        .filter((x) => x.active)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.label}
                          </option>
                        ))}
                    </select>
                  </label>
                ))}
            </div>
            <div className="admin-actions">
              <OrderButtons
                index={i}
                length={p.variants.length}
                onMove={(d) => set("variants", move(p.variants, i, d))}
              />
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  set(
                    "variants",
                    p.variants.filter((_, n) => n !== i),
                  )
                }
              >
                Remove variant
              </button>
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() =>
            set("variants", [
              ...p.variants,
              {
                id: crypto.randomUUID(),
                sku: "",
                title: "",
                price_override: "",
                price_delta: "",
                compare_at_price: "",
                weight_override_grams: null,
                inventory_strategy: "MADE_TO_ORDER",
                stock_quantity: null,
                active: true,
                sort_order: p.variants.length,
                value_ids: [],
              },
            ])
          }
        >
          Add valid combination
        </button>
      </fieldset>
      <fieldset>
        <legend>Gallery</legend>
        <MediaUpload />
        {p.images.map((image, i) => (
          <div
            className="admin-card"
            key={image.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isInteger(from) && from >= 0 && from < p.images.length)
                set("images", move(p.images, from, i - from));
            }}
          >
            <div className="admin-grid">
              <MediaPicker
                items={media}
                value={image.asset_id}
                onChange={(asset_id) =>
                  set(
                    "images",
                    p.images.map((x, j) => (i === j ? { ...x, asset_id } : x)),
                  )
                }
              />
              <Field
                label="Alt text"
                value={image.alt}
                onChange={(alt) =>
                  set(
                    "images",
                    p.images.map((x, j) => (i === j ? { ...x, alt } : x)),
                  )
                }
              />
              <label>
                Variant association
                <select
                  value={image.variant_id ?? ""}
                  onChange={(e) =>
                    set(
                      "images",
                      p.images.map((x, j) =>
                        i === j
                          ? { ...x, variant_id: e.target.value || null }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="">All variants</option>
                  {p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title || v.sku}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <input
                type="radio"
                name="primary-image"
                checked={image.is_primary}
                onChange={() =>
                  set(
                    "images",
                    p.images.map((x, j) => ({ ...x, is_primary: i === j })),
                  )
                }
              />
              Primary image
            </label>
            <div className="admin-actions">
              <OrderButtons
                index={i}
                length={p.images.length}
                onMove={(d) => set("images", move(p.images, i, d))}
              />
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  set(
                    "images",
                    p.images
                      .filter((_, j) => i !== j)
                      .map((x, j) => ({
                        ...x,
                        is_primary: image.is_primary ? j === 0 : x.is_primary,
                      })),
                  )
                }
              >
                Remove image
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("images", [
              ...p.images,
              {
                id: crypto.randomUUID(),
                asset_id: null,
                path: "",
                alt: "",
                width: 1,
                height: 1,
                is_primary: p.images.length === 0,
                sort_order: p.images.length,
                variant_id: null,
              },
            ])
          }
        >
          Add gallery image
        </button>
      </fieldset>
      <div className="admin-save">
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
