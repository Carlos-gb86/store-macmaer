import type { Product, ProductOption } from "@/modules/catalog/schema";
import {
  isAvailable,
  resolveVariant,
  validateSelections,
  type Selections,
} from "@/modules/catalog/selection";
import { convertMinorAmount } from "@/modules/currency/money";
import type { PricingContext } from "@/modules/currency/schema";

function safeAdd(values: number[]) {
  const value = values.reduce((total, item) => total + item, 0);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Configured price is outside the supported range.");
  return value;
}

function optionDelta(option: ProductOption, values: string[]) {
  if (!option.affects_price) return 0;
  return values.reduce((total, id) => {
    const value = option.values.find((candidate) => candidate.id === id);
    if (!value?.active)
      throw new Error("Selected price option is unavailable.");
    return total + value.price_delta;
  }, 0);
}

export function calculateBaseLinePrice(
  product: Product,
  selections: Selections,
) {
  const errors = validateSelections(product, selections);
  if (errors.length) throw new Error(errors[0]);
  const variant = resolveVariant(product, selections);
  const configuredBase =
    variant?.price_override ?? product.base_price + (variant?.price_delta ?? 0);
  const deltas = product.options.map((option) =>
    optionDelta(option, selections[option.key] ?? []),
  );
  const amount = safeAdd([configuredBase, ...deltas]);
  const compareBase = variant?.compare_at_price ?? product.compare_at_price;
  const candidateCompare =
    compareBase === null ? null : safeAdd([compareBase, ...deltas]);
  return {
    amount,
    compareAtAmount:
      candidateCompare !== null && candidateCompare > amount
        ? candidateCompare
        : null,
    variant,
  };
}

function requiredMinimumDelta(option: ProductOption) {
  if (!option.affects_price || !option.values.length) return 0;
  const active = option.values
    .filter((value) => value.active)
    .map((value) => value.price_delta)
    .sort((a, b) => a - b);
  const requiredCount =
    option.display_type === "repeated_select"
      ? option.required
        ? option.repeat_count
        : option.min_selections
      : option.required
        ? Math.max(1, option.min_selections)
        : option.min_selections;
  if (requiredCount === 0) return 0;
  if (
    !active.length ||
    (!option.allow_duplicates && active.length < requiredCount)
  )
    throw new Error("A required price option is unavailable.");
  if (option.allow_duplicates) return active[0]! * requiredCount;
  return active.slice(0, requiredCount).reduce((sum, value) => sum + value, 0);
}

export function calculateProductStartingPrice(product: Product) {
  const priceOptions = product.options.filter((option) => option.affects_price);
  const nonAxisDelta = priceOptions
    .filter((option) => !option.is_variant_axis)
    .reduce((sum, option) => sum + requiredMinimumDelta(option), 0);
  const variants = product.options.some((option) => option.is_variant_axis)
    ? product.variants.filter(
        (variant) => variant.active && isAvailable(variant),
      )
    : [];
  if (!variants.length) return safeAdd([product.base_price, nonAxisDelta]);
  const amounts = variants.map((variant) => {
    const axisDelta = priceOptions
      .filter((option) => option.is_variant_axis)
      .reduce(
        (sum, option) =>
          sum +
          optionDelta(
            option,
            variant.value_ids.filter((id) =>
              option.values.some((value) => value.id === id),
            ),
          ),
        0,
      );
    return safeAdd([
      variant.price_override ?? product.base_price + (variant.price_delta ?? 0),
      axisDelta,
      nonAxisDelta,
    ]);
  });
  return Math.min(...amounts);
}

export function displayAmount(amount: number, context: PricingContext) {
  return convertMinorAmount(
    amount,
    context.currency,
    context.rate,
    context.setting.markupBasisPoints,
    context.setting.roundingIncrementMinor,
  );
}
