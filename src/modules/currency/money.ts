import type { Currency, FxRate } from "./schema";

function assertMinorAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Expected non-negative integer minor units.");
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n || numerator < 0n)
    throw new Error("Invalid money ratio.");
  return (numerator * 2n + denominator) / (denominator * 2n);
}

function safeMinorNumber(value: bigint) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new Error("Money amount is outside the supported range.");
  return result;
}

export function convertMinorAmount(
  amount: number,
  currency: Currency,
  rate: FxRate | null,
  markupBasisPoints = 0,
  roundingIncrementMinor = 1,
) {
  assertMinorAmount(amount);
  if (
    !Number.isInteger(markupBasisPoints) ||
    markupBasisPoints < 0 ||
    markupBasisPoints > 10_000 ||
    !Number.isInteger(roundingIncrementMinor) ||
    roundingIncrementMinor < 1
  )
    throw new Error("Invalid currency pricing settings.");
  if (currency === "SEK") return amount;
  if (!rate || rate.quoteCurrency !== currency)
    throw new Error("A current exchange rate is unavailable.");

  const markedNumerator =
    BigInt(amount) * rate.numerator * BigInt(10_000 + markupBasisPoints);
  const markedDenominator = rate.denominator * 10_000n;
  const converted = divideRoundHalfUp(markedNumerator, markedDenominator);
  const increment = BigInt(roundingIncrementMinor);
  return safeMinorNumber(divideRoundHalfUp(converted, increment) * increment);
}

export function formatMoney(amount: number, currency: Currency) {
  assertMinorAmount(amount);
  const minor = BigInt(amount);
  const whole = new Intl.NumberFormat("en-GB").format(minor / 100n);
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return whole + (fraction === "00" ? "" : "." + fraction) + " " + currency;
}

export function decimalRatio(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value))
    throw new Error("Invalid decimal exchange rate.");
  const [whole, fraction = ""] = value.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole + fraction);
  if (numerator <= 0n) throw new Error("Exchange rates must be positive.");
  return { numerator, denominator };
}
