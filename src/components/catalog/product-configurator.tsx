"use client";
import Image from "next/image";
import { useState } from "react";
import type { Product, ProductOption } from "@/modules/catalog/schema";
import {
  isAvailable,
  resolveVariant,
  validateSelections,
  type Selections,
} from "@/modules/catalog/selection";
import { resolveImage } from "@/modules/media/resolve-image";
import { Button } from "@/components/ui/button";
function OptionControl({
  option,
  values,
  onChange,
}: {
  option: ProductOption;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const activeValues = option.values.filter((value) => value.active);
  const id = "option-" + option.id;
  if (option.display_type === "short_text" || option.display_type === "number")
    return (
      <div className="option-field">
        <label htmlFor={id}>
          {option.label}
          {!option.required && " (optional)"}
        </label>
        <input
          id={id}
          type={option.display_type === "number" ? "number" : "text"}
          value={values[0] ?? ""}
          required={option.required}
          maxLength={option.validation_rules.max_length ?? 120}
          min={option.validation_rules.min}
          max={option.validation_rules.max}
          step={option.validation_rules.step ?? 1}
          onChange={(event) => onChange([event.target.value])}
        />
      </div>
    );
  if (
    option.display_type === "select" ||
    option.display_type === "repeated_select"
  )
    return (
      <fieldset className="option-field">
        <legend>
          {option.label}
          {!option.required && " (optional)"}
        </legend>
        <div className="repeat-options">
          {Array.from({ length: option.repeat_count }, (_, index) => (
            <div key={index}>
              <label
                className={option.repeat_count === 1 ? "sr-only" : ""}
                htmlFor={id + "-" + index}
              >
                {option.label}
                {option.repeat_count > 1 ? " " + (index + 1) : ""}
              </label>
              <select
                id={id + "-" + index}
                value={values[index] ?? ""}
                required={option.required}
                onChange={(event) => {
                  const next = Array.from(
                    { length: option.repeat_count },
                    (_, i) => values[i] ?? "",
                  );
                  next[index] = event.target.value;
                  onChange(next);
                }}
              >
                <option value="">Choose {option.label.toLowerCase()}</option>
                {activeValues.map((value) => (
                  <option
                    key={value.id}
                    value={value.id}
                    disabled={
                      !option.allow_duplicates &&
                      values.some((v, i) => i !== index && v === value.id)
                    }
                  >
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>
    );
  return (
    <fieldset className="option-field">
      <legend>
        {option.label}
        {!option.required && " (optional)"}
      </legend>
      <div className="option-choices">
        {activeValues.map((value) => (
          <label
            key={value.id}
            className={
              "option-choice " + (values.includes(value.id) ? "selected" : "")
            }
          >
            <input
              type={option.display_type === "checkbox" ? "checkbox" : "radio"}
              name={id}
              value={value.id}
              checked={values.includes(value.id)}
              onChange={(event) => {
                onChange(
                  option.display_type === "checkbox"
                    ? event.target.checked
                      ? [...values, value.id]
                      : values.filter((v) => v !== value.id)
                    : [value.id],
                );
              }}
            />
            {option.display_type === "colour_swatch" && value.colour_hex && (
              <span
                className="swatch"
                style={{ backgroundColor: value.colour_hex }}
                aria-hidden="true"
              />
            )}
            {option.display_type === "image_swatch" && value.image_path && (
              <Image
                src={resolveImage(value.image_path)}
                alt=""
                width={36}
                height={36}
              />
            )}
            <span>{value.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function ProductConfigurator({ product }: { product: Product }) {
  const [selections, setSelections] = useState<Selections>({});
  const [checked, setChecked] = useState(false);
  const variant = resolveVariant(product, selections);
  const errors = checked ? validateSelections(product, selections) : [];
  const available = isAvailable(product) && (!variant || isAvailable(variant));
  return (
    <div className="configuration">
      {product.options.length > 0 && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setChecked(true);
          }}
        >
          {product.options.map((option) => (
            <OptionControl
              key={option.id}
              option={option}
              values={selections[option.key] ?? []}
              onChange={(value) => {
                setSelections((current) => ({
                  ...current,
                  [option.key]: value,
                }));
                setChecked(false);
              }}
            />
          ))}
          <Button type="submit" className="button-secondary">
            Preview configuration
          </Button>
          <div aria-live="polite" className="configuration-feedback">
            {checked && errors.length > 0 && (
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
            {checked && errors.length === 0 && (
              <p>
                Your selections are ready to preview.
                {variant && " " + variant.title + " · " + variant.sku}
              </p>
            )}
          </div>
        </form>
      )}
      <p className="availability">
        <span aria-hidden="true">○</span>{" "}
        {!available
          ? "Currently unavailable"
          : (variant ?? product).inventory_strategy === "MADE_TO_ORDER"
            ? "Made to order"
            : "Available in the catalogue"}
      </p>
      {product.processing_time && (
        <p className="small">{product.processing_time}</p>
      )}
      <p className="preview-note">
        Explore the details and find your favourite combination. Online ordering
        opens soon.
      </p>
    </div>
  );
}
