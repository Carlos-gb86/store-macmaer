import type { Product, ProductVariant } from "./schema";
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
): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(selections))
    if (!product.options.some((option) => option.key === key))
      errors.push("Unknown option.");
  for (const option of product.options) {
    const values = (selections[option.key] ?? []).filter(
      (value) => value.trim() !== "",
    );
    if (option.required && !values.length) {
      errors.push("Choose " + option.label.toLowerCase() + ".");
      continue;
    }
    if (!values.length) continue;
    if (
      option.display_type === "repeated_select" &&
      values.length !== option.repeat_count
    )
      errors.push(
        "Complete all " +
          option.repeat_count +
          " selections for " +
          option.label +
          ".",
      );
    if (
      !["checkbox", "repeated_select"].includes(option.display_type) &&
      values.length > 1
    )
      errors.push("Choose one " + option.label.toLowerCase() + ".");
    if (
      values.length < option.min_selections ||
      (option.max_selections !== null && values.length > option.max_selections)
    )
      errors.push("Check the number of selections for " + option.label + ".");
    if (!option.allow_duplicates && new Set(values).size !== values.length)
      errors.push("Choose different values for " + option.label + ".");
    if (option.display_type === "short_text") {
      if (
        values.some(
          (value) => value.length > (option.validation_rules.max_length ?? 120),
        )
      )
        errors.push(option.label + " is too long.");
    } else if (option.display_type === "number") {
      if (
        values.some(
          (value) =>
            !Number.isFinite(Number(value)) ||
            (option.validation_rules.min !== undefined &&
              Number(value) < option.validation_rules.min) ||
            (option.validation_rules.max !== undefined &&
              Number(value) > option.validation_rules.max),
        )
      )
        errors.push("Enter a valid " + option.label.toLowerCase() + ".");
    } else if (
      values.some(
        (id) => !option.values.some((value) => value.id === id && value.active),
      )
    )
      errors.push("Choose an available " + option.label.toLowerCase() + ".");
  }
  if (
    product.options.some((option) => option.is_variant_axis) &&
    !resolveVariant(product, selections)
  )
    errors.push("This combination is unavailable.");
  return [...new Set(errors)];
}
