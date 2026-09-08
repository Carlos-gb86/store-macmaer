"use client";
import { useState } from "react";
import { Plus, Trash2, Layers } from "lucide-react";
import type { ProductInput } from "@/modules/admin/schema";
import { Field, OrderButtons, move } from "./fields";
type Variant = ProductInput["variants"][number];
type Option = ProductInput["options"][number];
export const inventoryChoices = [
  "TRACKED",
  "MADE_TO_ORDER",
  "UNLIMITED",
  "UNAVAILABLE",
] as const;
export function VariantsEditor({
  product,
  onChange,
}: {
  product: ProductInput;
  onChange: (variants: Variant[]) => void;
}) {
  const axes = product.options.filter((o) => o.is_variant_axis);
  return (
    <fieldset id="product-variants">
      <legend>Variants & stock combinations</legend>
      <p className="section-intro">
        A variant is a specific version you sell with its own SKU, price or
        stock: for example, a <strong>Large / Cream</strong> pillow. Options
        describe the choices; variants describe the versions you actually offer.
      </p>
      {!axes.length && (
        <div className="empty-state">
          <Layers size={24} />
          <p>
            Most personalisation options do not need variants. To track separate
            versions, enable “Use this option for variants” in{" "}
            <a href="#product-options">Customer options</a> first.
          </p>
        </div>
      )}
      {product.variants.map((v, i) => (
        <VariantCard
          key={v.id}
          value={v}
          axes={axes}
          index={i}
          length={product.variants.length}
          onChange={(patch) =>
            onChange(
              product.variants.map((x, j) =>
                j === i ? { ...x, ...patch } : x,
              ),
            )
          }
          onMove={(d) => onChange(move(product.variants, i, d))}
          onRemove={() => {
            if (
              window.confirm(
                "Remove this variant? If a gallery image uses it, change that image’s association before saving.",
              )
            )
              onChange(product.variants.filter((_, j) => j !== i));
          }}
        />
      ))}
      <button
        type="button"
        className="secondary"
        disabled={!axes.length}
        onClick={() =>
          onChange([
            ...product.variants,
            {
              id: crypto.randomUUID(),
              sku: "",
              title: "",
              price_override: "",
              price_delta: "",
              compare_at_price: "",
              weight_override_grams: null,
              inventory_strategy: product.inventory_strategy,
              stock_quantity:
                product.inventory_strategy === "TRACKED" ? 0 : null,
              active: true,
              sort_order: product.variants.length,
              value_ids: [],
            },
          ])
        }
      >
        <Plus size={17} />
        Add variant
      </button>
      {!!axes.length && (
        <p className="field-note">
          Add only combinations you sell. Repeated pack choices never create
          variants automatically.
        </p>
      )}
    </fieldset>
  );
}
function VariantCard({
  value: v,
  axes,
  index,
  length,
  onChange,
  onRemove,
  onMove,
}: {
  value: Variant;
  axes: Option[];
  index: number;
  length: number;
  onChange: (patch: Partial<Variant>) => void;
  onRemove: () => void;
  onMove: (d: number) => void;
}) {
  const [open, setOpen] = useState(!v.sku);
  const [mode, setMode] = useState(
    v.price_override !== "" && v.price_override !== null
      ? "override"
      : v.price_delta !== "" && v.price_delta !== null
        ? "adjustment"
        : "base",
  );
  const combination = (ids: string[]) =>
    axes
      .map((o) => o.values.find((x) => ids.includes(x.id))?.label)
      .filter(Boolean)
      .join(" / ");
  const invalid =
    v.value_ids.length !== axes.length ||
    !axes.length ||
    axes.some(
      (o) =>
        o.values.filter((x) => x.active && v.value_ids.includes(x.id))
          .length !== 1,
    );
  return (
    <details
      className="editor-item"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>{v.title || "New variant"}</strong>
          <small>
            {v.sku || "SKU needed"}
            {combination(v.value_ids) ? " · " + combination(v.value_ids) : ""}
          </small>
        </span>
        <span className={"status-badge " + (invalid ? "warning" : "")}>
          {invalid ? "Choose combination" : v.active ? "Active" : "Hidden"}
        </span>
      </summary>
      <div className="editor-item-body">
        {invalid && (
          <p className="inline-warning">
            Choose one available value for each option. If an option or choice
            was removed, update this combination or remove the variant.
          </p>
        )}
        <h3>1. Choose the combination</h3>
        <div className="admin-grid">
          {axes.map((o) => (
            <label key={o.id}>
              {o.label}
              <select
                value={
                  v.value_ids.find((id) => o.values.some((x) => x.id === id)) ??
                  ""
                }
                onChange={(e) => {
                  const ids = [
                    ...v.value_ids.filter((id) =>
                      axes.some(
                        (a) =>
                          a.id !== o.id && a.values.some((x) => x.id === id),
                      ),
                    ),
                    ...(e.target.value ? [e.target.value] : []),
                  ];
                  onChange({
                    value_ids: ids,
                    ...(!v.title || v.title === combination(v.value_ids)
                      ? { title: combination(ids) }
                      : {}),
                  });
                }}
              >
                <option value="">Choose {o.label.toLowerCase()}</option>
                {o.values.map((x) => (
                  <option key={x.id} value={x.id} disabled={!x.active}>
                    {x.label}
                    {!x.active ? " (unavailable)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="admin-grid">
          <Field
            label="Variant title"
            value={v.title}
            onChange={(x) => onChange({ title: String(x) })}
          />
          <Field
            label="Variant SKU"
            value={v.sku}
            onChange={(x) => onChange({ sku: String(x) })}
            help="A unique stock code for this version, different from the product SKU. For example, PILLOW-L-CREAM."
          />
        </div>
        <h3 className="subsection-heading">2. Set price & availability</h3>
        <div className="admin-grid">
          <label>
            Variant pricing
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                onChange({ price_override: "", price_delta: "" });
              }}
            >
              <option value="base">Use product base price</option>
              <option value="override">Set a different price</option>
              <option value="adjustment">Adjust the base price</option>
            </select>
          </label>
          {mode === "override" && (
            <Field
              label="Variant price (SEK)"
              value={v.price_override}
              onChange={(x) =>
                onChange({ price_override: String(x), price_delta: "" })
              }
              help="Replaces the product’s base price for this version."
            />
          )}
          {mode === "adjustment" && (
            <Field
              label="Price adjustment (SEK)"
              value={v.price_delta}
              onChange={(x) =>
                onChange({ price_delta: String(x), price_override: "" })
              }
              help="Use a positive amount to add to the base price, or a negative amount to reduce it."
            />
          )}
          <Field
            label="Variant inventory strategy"
            value={v.inventory_strategy}
            options={inventoryChoices}
            onChange={(x) =>
              onChange({
                inventory_strategy: x as Variant["inventory_strategy"],
                stock_quantity:
                  x === "TRACKED" ? (v.stock_quantity ?? 0) : null,
              })
            }
          />
          {v.inventory_strategy === "TRACKED" && (
            <Field
              label="Variant stock quantity"
              value={v.stock_quantity}
              numeric
              nullable
              onChange={(x) =>
                onChange({ stock_quantity: x === null ? null : Number(x) })
              }
            />
          )}
        </div>
        <Field
          label="Variant available to customers"
          value={v.active}
          onChange={(x) => onChange({ active: Boolean(x) })}
        />
        <details className="advanced-fields">
          <summary>Compare-at price & weight</summary>
          <div className="admin-grid">
            <Field
              label="Variant compare-at price (SEK)"
              value={v.compare_at_price}
              onChange={(x) => onChange({ compare_at_price: String(x) })}
            />
            <Field
              label="Variant weight (grams)"
              value={v.weight_override_grams}
              numeric
              nullable
              onChange={(x) =>
                onChange({
                  weight_override_grams: x === null ? null : Number(x),
                })
              }
              help="Leave blank to use the product’s weight."
            />
          </div>
        </details>
        <div className="item-footer">
          <div className="admin-actions">
            <OrderButtons index={index} length={length} onMove={onMove} />
          </div>
          <button type="button" className="secondary danger" onClick={onRemove}>
            <Trash2 size={16} />
            Remove variant
          </button>
        </div>
      </div>
    </details>
  );
}
