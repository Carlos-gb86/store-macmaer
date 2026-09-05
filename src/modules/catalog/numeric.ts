// Scale decimal values to integers so step boundaries do not drift (e.g. 0.3 / 0.1).
export function matchesNumericStep(value: number, min = 0, step = 1): boolean {
  const places = (n: number) => {
    const [coefficient, exponent = "0"] = n.toString().toLowerCase().split("e");
    return Math.max(
      0,
      (coefficient!.split(".")[1]?.length ?? 0) - Number(exponent),
    );
  };
  const precision = Math.max(places(value), places(min), places(step));
  if (precision > 12) return false;
  const scale = 10 ** precision,
    scaled = [value, min, step].map((n) => Math.round(n * scale));
  const [amount = NaN, base = NaN, increment = NaN] = scaled;
  return (
    scaled.every(Number.isSafeInteger) &&
    increment > 0 &&
    (amount - base) % increment === 0
  );
}
