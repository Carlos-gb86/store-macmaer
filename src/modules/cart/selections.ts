import type { Product } from "@/modules/catalog/schema";
import {
  validateSelections,
  type Selections,
} from "@/modules/catalog/selection";
import {
  cartOptionsSnapshotSchema,
  rawSelectionsSchema,
  CartValidationError,
  type CartOptionSnapshot,
} from "./schema";

export function canonicalizeSelections(product: Product, input: unknown) {
  const parsed = rawSelectionsSchema.parse(input);
  if (
    Object.keys(parsed).some(
      (key) => !product.options.some((option) => option.key === key),
    )
  )
    throw new CartValidationError("Unknown option.");
  const normalized: Selections = {};
  const snapshot: CartOptionSnapshot[] = [];

  for (const option of [...product.options].sort(
    (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
  )) {
    let inputs = (parsed[option.key] ?? [])
      .map((value) => value.trim().normalize("NFC"))
      .filter(Boolean);
    if (option.display_type === "number")
      inputs = inputs.map((value) => String(Number(value)));
    if (option.display_type === "checkbox") {
      inputs = [...new Set(inputs)];
      const position = new Map(
        option.values.map((value, index) => [value.id, index]),
      );
      inputs.sort(
        (a, b) => (position.get(a) ?? 9999) - (position.get(b) ?? 9999),
      );
    }
    if (inputs.length) normalized[option.key] = inputs;
  }
  const errors = validateSelections(product, normalized);
  if (errors.length) throw new CartValidationError(errors[0]);

  for (const option of product.options) {
    const inputs = normalized[option.key] ?? [];
    if (!inputs.length) continue;
    const freeform = ["short_text", "number"].includes(option.display_type);
    snapshot.push({
      optionId: option.id,
      key: option.key,
      label: option.label,
      displayType: option.display_type,
      values: inputs.map((input) => {
        const value = freeform
          ? undefined
          : option.values.find((candidate) => candidate.id === input);
        return {
          id: value?.id ?? null,
          key: value?.key ?? null,
          label: value?.label ?? input,
          input,
        };
      }),
    });
  }
  return { selections: normalized, snapshot };
}

export function selectionsFromSnapshot(
  product: Product,
  value: unknown,
): Selections {
  const parsed = cartOptionsSnapshotSchema.safeParse(value);
  if (!parsed.success)
    throw new CartValidationError(
      "This saved configuration is no longer available.",
    );
  const snapshot = parsed.data;
  return Object.fromEntries(
    snapshot.map((entry) => {
      const current = product.options.find(
        (option) => option.id === entry.optionId,
      );
      if (!current)
        throw new CartValidationError(`${entry.label} is no longer available.`);
      return [current.key, entry.values.map((item) => item.input)];
    }),
  );
}
