import type { CartOptionSnapshot } from "./schema";

export function formatOptionSelections(option: CartOptionSnapshot) {
  if (option.displayType === "repeated_select")
    return option.values.map(
      (value, index) => `${option.label} ${index + 1}: ${value.label}`,
    );
  return option.values.length
    ? [
        `${option.label}: ${option.values.map((value) => value.label).join(", ")}`,
      ]
    : [];
}

export function formatOptions(options: CartOptionSnapshot[]) {
  return options.flatMap(formatOptionSelections);
}
