import { z } from "zod";
export function parseMinorUnits(value: string, signed = false): number {
  const input = value.trim();
  if (
    !(signed ? /^-?\d+(?:[.,]\d{1,2})?$/ : /^\d+(?:[.,]\d{1,2})?$/).test(input)
  )
    throw new Error("Enter an amount with at most two decimals.");
  const negative = input.startsWith("-");
  const [whole = "0", fraction = ""] = input
    .replace("-", "")
    .replace(",", ".")
    .split(".");
  const amount =
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) *
    (negative ? -1n : 1n);
  if (amount < (signed ? -2147483648n : 0n) || amount > 2147483647n)
    throw new Error("Amount is outside the supported range.");
  return Number(amount);
}
export function minorUnitsInput(value: number | null): string {
  if (value === null) return "";
  const n = BigInt(value),
    absolute = n < 0n ? -n : n;
  return (
    (n < 0n ? "-" : "") +
    absolute / 100n +
    "." +
    (absolute % 100n).toString().padStart(2, "0")
  );
}
export function amountSchema(signed = false, optional = false) {
  return z.string().transform((value, ctx) => {
    if (optional && value.trim() === "") return null;
    try {
      return parseMinorUnits(value, signed);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid amount",
      });
      return z.NEVER;
    }
  });
}
