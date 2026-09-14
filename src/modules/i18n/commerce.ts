import type { StorefrontLocale } from "./config";

export function localizeCommerceMessage(
  message: string | null | undefined,
  locale: StorefrontLocale,
) {
  if (!message || locale === "en") return message;
  const exact: Record<string, string> = {
    "VAT is included in the displayed total and calculated for the shipping destination.":
      "Moms ingår i den visade totalsumman och beräknas för leveranslandet.",
    "That discount code is not available.":
      "Den rabattkoden är inte tillgänglig.",
    "That discount code is not currently active.":
      "Den rabattkoden är inte aktiv just nu.",
    "That discount code has reached its usage limit.":
      "Rabattkodens användningsgräns har nåtts.",
    "The cart does not meet this discount's minimum spend.":
      "Varukorgen når inte rabattens minsta köpbelopp.",
    "That discount does not apply to these products.":
      "Rabatten gäller inte för dessa produkter.",
  };
  return exact[message] ?? message;
}

export function localizeShippingLabel(
  label: string | null | undefined,
  locale: StorefrontLocale,
) {
  if (!label || locale === "en") return label;
  const labels: Record<string, string> = {
    Sweden: "Sverige",
    "United States": "USA",
    EU: "EU",
    "Other Non-EU": "Övriga länder utanför EU",
    "Tracked shipping": "Spårbar frakt",
    "Standard shipping": "Standardfrakt",
  };
  return labels[label] ?? label;
}
