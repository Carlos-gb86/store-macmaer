"use client";
import { useState } from "react";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";
import type { ProductInput } from "@/modules/admin/schema";
import type { MediaItem } from "@/modules/admin/media";
import { Field, OrderButtons, move, friendlyValue } from "./fields";
import { MediaPicker } from "./media-picker";
type Option = ProductInput["options"][number];
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
export const inputKey = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function OptionsEditor({
  options,
  onChange,
  media,
}: {
  options: Option[];
  onChange: (options: Option[]) => void;
  media: MediaItem[];
}) {
  return (
    <fieldset id="product-options">
      <legend>Customer options</legend>
      <p className="section-intro">
        Options are choices the customer makes, such as colour, size or a
        personal message. A simple product does not need any options.
      </p>
      {!options.length && (
        <div className="empty-state">
          <SlidersHorizontal size={24} />
          <p>
            No options yet. Add one if customers need to customise this product.
          </p>
        </div>
      )}
      {options.map((o, i) => (
        <OptionCard
          key={o.id}
          option={o}
          media={media}
          index={i}
          length={options.length}
          onMove={(d) => onChange(move(options, i, d))}
          onRemove={() => {
            if (
              window.confirm(
                "Remove this option? Any variants using its choices must also be updated before saving.",
              )
            )
              onChange(options.filter((_, j) => j !== i));
          }}
          onChange={(patch) =>
            onChange(options.map((x, j) => (j === i ? { ...x, ...patch } : x)))
          }
        />
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          onChange([
            ...options,
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
              sort_order: options.length,
              values: [],
            },
          ])
        }
      >
        <Plus size={17} />
        Add option
      </button>
    </fieldset>
  );
}
function OptionCard({
  option: o,
  onChange,
  onRemove,
  onMove,
  index,
  length,
  media,
}: {
  option: Option;
  onChange: (patch: Partial<Option>) => void;
  onRemove: () => void;
  onMove: (d: number) => void;
  index: number;
  length: number;
  media: MediaItem[];
}) {
  const [open, setOpen] = useState(!o.label);
  const input = ["short_text", "number"].includes(o.display_type);
  const multiple = ["checkbox", "repeated_select"].includes(o.display_type);
  const axis = ["select", "radio", "colour_swatch", "image_swatch"].includes(
    o.display_type,
  );
  return (
    <details
      className="editor-item"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>{o.label || "New option"}</strong>
          <small>
            {friendlyValue(o.display_type)} ·{" "}
            {input ? "Customer input" : o.values.length + " choices"}
            {o.is_variant_axis ? " · Used for variants" : ""}
          </small>
        </span>
        <span className="status-badge">
          {o.required ? "Required" : "Optional"}
        </span>
      </summary>
      <div className="editor-item-body">
        <div className="admin-grid">
          <Field
            label="Option label"
            value={o.label}
            placeholder="e.g. Colour"
            onChange={(v) =>
              onChange({
                label: String(v),
                ...(!o.key || o.key === inputKey(o.label)
                  ? { key: inputKey(String(v)) }
                  : {}),
              })
            }
            help="The name customers see above this choice."
          />
          <Field
            label="Display type"
            value={o.display_type}
            options={types}
            onChange={(v) => {
              const type = v as Option["display_type"];
              const freeInput = ["short_text", "number"].includes(type);
              if (
                freeInput &&
                o.values.length &&
                !window.confirm(
                  "Text and number inputs do not have preset choices. Remove the current choices? Update any affected variants before saving.",
                )
              )
                return;
              onChange({
                display_type: type,
                repeat_count: type === "repeated_select" ? 5 : 1,
                min_selections: 0,
                max_selections: null,
                validation_rules: {},
                ...(freeInput
                  ? { values: [], affects_price: false, affects_weight: false }
                  : {}),
                ...(![
                  "select",
                  "radio",
                  "colour_swatch",
                  "image_swatch",
                ].includes(type)
                  ? { is_variant_axis: false }
                  : {}),
              });
            }}
            help="Choose how customers make this selection. Repeated choices let them choose each item in a pack, without creating separate stock combinations."
          />
        </div>
        <Field
          label="Required choice"
          value={o.required}
          onChange={(v) =>
            onChange({
              required: Boolean(v),
              ...(!v ? { is_variant_axis: false } : {}),
            })
          }
          help="Customers must complete this option before purchasing."
        />
        {axis && (
          <Field
            label="Use this option for variants"
            value={o.is_variant_axis}
            onChange={(v) =>
              onChange({
                is_variant_axis: Boolean(v),
                ...(v ? { required: true } : {}),
              })
            }
            help="Enable when each choice or combination needs its own SKU, stock or price. For example, Small / Cream and Large / Cream. Configure these combinations in Variants below."
          />
        )}
        {o.display_type === "repeated_select" && (
          <Field
            label="Number of choices in the pack"
            value={o.repeat_count}
            numeric
            onChange={(v) => onChange({ repeat_count: Number(v) })}
            help="A pack of five presents five choices from the same list."
          />
        )}
        {multiple && (
          <Field
            label="Allow the same choice more than once"
            value={o.allow_duplicates}
            onChange={(v) => onChange({ allow_duplicates: Boolean(v) })}
          />
        )}
        {input ? (
          <div className="admin-grid">
            {(o.display_type === "short_text"
              ? (["max_length"] as const)
              : (["min", "max", "step"] as const)
            ).map((key) => (
              <Field
                key={key}
                label={
                  {
                    max_length: "Maximum text length",
                    min: "Minimum number",
                    max: "Maximum number",
                    step: "Number increments",
                  }[key]
                }
                value={o.validation_rules[key]}
                numeric
                nullable
                onChange={(v) => {
                  const rules = { ...o.validation_rules };
                  if (v === null) delete rules[key];
                  else rules[key] = Number(v);
                  onChange({ validation_rules: rules });
                }}
                help={
                  key === "step"
                    ? "For example, 1 allows whole numbers; 0.5 allows half steps."
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <>
            <h3 className="subsection-heading">Available choices</h3>
            <p className="field-note">
              Add the choices customers can select, such as Cream, Olive and
              Terracotta.
            </p>
            {o.values.map((value, j) => (
              <div className="option-value" key={value.id}>
                <div className="choice-main">
                  <Field
                    label="Choice label"
                    value={value.label}
                    placeholder="e.g. Cream"
                    onChange={(v) =>
                      onChange({
                        values: o.values.map((x, n) =>
                          n === j
                            ? {
                                ...x,
                                label: String(v),
                                ...(!x.key || x.key === inputKey(x.label)
                                  ? { key: inputKey(String(v)) }
                                  : {}),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  {o.display_type === "colour_swatch" && (
                    <label className="colour-field">
                      Colour
                      <input
                        type="color"
                        value={value.colour_hex ?? "#e8e0d4"}
                        onChange={(e) =>
                          onChange({
                            values: o.values.map((x, n) =>
                              n === j
                                ? { ...x, colour_hex: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                  )}
                  <div className="admin-actions">
                    <OrderButtons
                      index={j}
                      length={o.values.length}
                      onMove={(d) => onChange({ values: move(o.values, j, d) })}
                    />
                    <button
                      type="button"
                      className="secondary icon-button danger"
                      aria-label={"Remove choice " + (value.label || j + 1)}
                      title="Remove choice"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Remove this choice? Update any variants that use it before saving.",
                          )
                        )
                          onChange({
                            values: o.values.filter((_, n) => n !== j),
                          });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {o.display_type === "image_swatch" && (
                  <MediaPicker
                    items={media}
                    value={value.asset_id}
                    fallbackPath={value.image_path}
                    label="Swatch image"
                    onChange={(id) =>
                      onChange({
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
                )}
                <details className="advanced-fields">
                  <summary>
                    Choice settings{!value.active ? " · Hidden" : ""}
                  </summary>
                  <div className="admin-grid">
                    <Field
                      label="Choice key"
                      value={value.key}
                      help="A unique internal identifier. Keep it stable once this choice is in use."
                      onChange={(v) =>
                        onChange({
                          values: o.values.map((x, n) =>
                            n === j ? { ...x, key: String(v) } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Available to customers"
                      value={value.active}
                      onChange={(v) =>
                        onChange({
                          values: o.values.map((x, n) =>
                            n === j ? { ...x, active: Boolean(v) } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Price adjustment (SEK)"
                      value={value.price_delta}
                      onChange={(v) =>
                        onChange({
                          values: o.values.map((x, n) =>
                            n === j ? { ...x, price_delta: String(v) } : x,
                          ),
                        })
                      }
                      help="A positive amount adds to the price; a negative amount reduces it. Enable price adjustments for this option below."
                    />
                    <Field
                      label="Weight adjustment (grams)"
                      value={value.weight_delta_grams}
                      numeric
                      onChange={(v) =>
                        onChange({
                          values: o.values.map((x, n) =>
                            n === j
                              ? { ...x, weight_delta_grams: Number(v) }
                              : x,
                          ),
                        })
                      }
                    />
                  </div>
                </details>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                onChange({
                  values: [
                    ...o.values,
                    {
                      id: crypto.randomUUID(),
                      key: "",
                      label: "",
                      colour_hex:
                        o.display_type === "colour_swatch" ? "#e8e0d4" : null,
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
              <Plus size={16} />
              Add choice
            </button>
          </>
        )}
        <details className="advanced-fields">
          <summary>Advanced option settings</summary>
          <div className="admin-grid">
            <Field
              label="Option key"
              value={o.key}
              onChange={(v) => onChange({ key: String(v) })}
              help="An internal identifier created from the label. It must be unique within this product."
            />
            {!input && (
              <>
                <Field
                  label="Enable price adjustments"
                  value={o.affects_price}
                  onChange={(v) => onChange({ affects_price: Boolean(v) })}
                />
                <Field
                  label="Enable weight adjustments"
                  value={o.affects_weight}
                  onChange={(v) => onChange({ affects_weight: Boolean(v) })}
                />
              </>
            )}
            {multiple && (
              <>
                <Field
                  label="Minimum selections"
                  value={o.min_selections}
                  numeric
                  onChange={(v) => onChange({ min_selections: Number(v) })}
                />
                <Field
                  label="Maximum selections"
                  value={o.max_selections}
                  numeric
                  nullable
                  onChange={(v) =>
                    onChange({ max_selections: v === null ? null : Number(v) })
                  }
                />
              </>
            )}
          </div>
        </details>
        <div className="item-footer">
          <div className="admin-actions">
            <OrderButtons index={index} length={length} onMove={onMove} />
          </div>
          <button type="button" className="secondary danger" onClick={onRemove}>
            <Trash2 size={16} />
            Remove option
          </button>
        </div>
      </div>
    </details>
  );
}
