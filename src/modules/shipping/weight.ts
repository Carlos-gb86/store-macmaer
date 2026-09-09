import type { Product } from "@/modules/catalog/schema";
import { resolveVariant, type Selections } from "@/modules/catalog/selection";

export function calculateUnitWeight(
  product: Product,
  selections: Selections,
): number | null {
  const variant = resolveVariant(product, selections);
  const base = variant?.weight_override_grams ?? product.weight_grams;
  if (base === null) return null;
  const optionDelta = product.options
    .filter((option) => option.affects_weight)
    .reduce(
      (total, option) =>
        total +
        (selections[option.key] ?? []).reduce((sum, valueId) => {
          const value = option.values.find((item) => item.id === valueId);
          if (!value?.active)
            throw new Error("Selected weight option is unavailable.");
          return sum + value.weight_delta_grams;
        }, 0),
      0,
    );
  const weight = base + optionDelta;
  if (!Number.isSafeInteger(weight) || weight < 0)
    throw new Error("Configured weight is outside the supported range.");
  return weight;
}
