// Display only. No currency conversion, tax treatment, or checkout calculation.
export function formatCataloguePrice(amount: number, currency: string) {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Expected non-negative integer minor units.");
  const minor = BigInt(amount);
  const whole = new Intl.NumberFormat("en-GB").format(minor / 100n);
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return whole + (fraction === "00" ? "" : "." + fraction) + " " + currency;
}
