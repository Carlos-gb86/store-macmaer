import type { Product, ProductVariant } from "./schema";
import { matchesNumericStep } from "./numeric";
import type { StorefrontLocale } from "@/modules/i18n/config";
export type Selections = Record<string, string[]>;
export function isAvailable(
  item: Pick<Product, "inventory_strategy" | "stock_quantity">,
) {
  return (
    item.inventory_strategy !== "UNAVAILABLE" &&
    (item.inventory_strategy !== "TRACKED" || (item.stock_quantity ?? 0) > 0)
  );
}
export function resolveVariant(
  product: Product,
  selections: Selections,
): ProductVariant | undefined {
  const axes = product.options.filter((option) => option.is_variant_axis);
  if (!axes.length || axes.some((axis) => selections[axis.key]?.length !== 1))
    return undefined;
  const ids = axes.map((axis) => selections[axis.key]?.[0]);
  return product.variants.find(
    (variant) =>
      variant.active &&
      variant.value_ids.length === ids.length &&
      ids.every((id) => id !== undefined && variant.value_ids.includes(id)),
  );
}
export function availableConfigurations(product: Product) {
  if (product.status !== "active" || !isAvailable(product)) return [];
  return product.options.some((option) => option.is_variant_axis)
    ? product.variants.filter(
        (variant) => variant.active && isAvailable(variant),
      )
    : [product];
}
export function validateSelections(
  product: Product,
  selections: Selections,
  locale: StorefrontLocale = "en",
): string[] {
  const sv = locale === "sv";
  const errors: string[] = [];
  for (const key of Object.keys(selections))
    if (!product.options.some((option) => option.key === key))
      errors.push(sv ? "Okänt alternativ." : "Unknown option.");
  for (const option of product.options) {
    const values = (selections[option.key] ?? []).filter(
      (value) => value.trim() !== "",
    );
    if (option.required && !values.length) {
      errors.push(
        (sv ? "Välj " : "Choose ") + option.label.toLocaleLowerCase() + ".",
      );
      continue;
    }
    if (!values.length) continue;
    if (
      option.display_type === "repeated_select" &&
      values.length !== option.repeat_count
    )
      errors.push(
        (sv ? "Fyll i alla " : "Complete all ") +
          option.repeat_count +
          (sv ? " val för " : " selections for ") +
          option.label +
          ".",
      );
    if (
      !["checkbox", "repeated_select"].includes(option.display_type) &&
      values.length > 1
    )
      errors.push(
        (sv ? "Välj en " : "Choose one ") +
          option.label.toLocaleLowerCase() +
          ".",
      );
    if (
      values.length < option.min_selections ||
      (option.max_selections !== null && values.length > option.max_selections)
    )
      errors.push(
        (sv
          ? "Kontrollera antalet val för "
          : "Check the number of selections for ") +
          option.label +
          ".",
      );
    if (!option.allow_duplicates && new Set(values).size !== values.length)
      errors.push(
        (sv ? "Välj olika värden för " : "Choose different values for ") +
          option.label +
          ".",
      );
    if (option.display_type === "short_text") {
      if (
        values.some(
          (value) => value.length > (option.validation_rules.max_length ?? 120),
        )
      )
        errors.push(
          sv ? option.label + " är för lång." : option.label + " is too long.",
        );
    } else if (option.display_type === "number") {
      if (
        values.some(
          (value) =>
            !Number.isFinite(Number(value)) ||
            (option.validation_rules.min !== undefined &&
              Number(value) < option.validation_rules.min) ||
            (option.validation_rules.max !== undefined &&
              Number(value) > option.validation_rules.max) ||
            !matchesNumericStep(
              Number(value),
              option.validation_rules.min ?? 0,
              option.validation_rules.step ?? 1,
            ),
        )
      )
        errors.push(
          (sv ? "Ange ett giltigt värde för " : "Enter a valid ") +
            option.label.toLocaleLowerCase() +
            ".",
        );
    } else if (
      values.some(
        (id) => !option.values.some((value) => value.id === id && value.active),
      )
    )
      errors.push(
        (sv
          ? "Välj ett tillgängligt alternativ för "
          : "Choose an available ") +
          option.label.toLocaleLowerCase() +
          ".",
      );
  }
  if (
    product.options.some((option) => option.is_variant_axis) &&
    !resolveVariant(product, selections)
  )
    errors.push(
      sv
        ? "Den här kombinationen är inte tillgänglig."
        : "This combination is unavailable.",
    );
  return [...new Set(errors)];
}
