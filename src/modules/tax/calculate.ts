import { ratioMinorAmount, sumMinorAmounts } from "@/modules/currency/money";
import type { TaxAmount, TaxRule, TaxSettings, TaxableAmount } from "./schema";

function activeRule(
  rules: TaxRule[],
  destinationCountry: string,
  categoryKey: string,
  now: Date,
) {
  const day = now.toISOString().slice(0, 10);
  return rules
    .filter(
      (rule) =>
        rule.enabled &&
        rule.countryCode === destinationCountry &&
        rule.taxCategoryKey === categoryKey &&
        rule.validFrom <= day &&
        (rule.validTo === null || rule.validTo >= day),
    )
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
}

export function calculateTaxAmounts(
  settings: TaxSettings,
  rules: TaxRule[],
  destinationCountry: string,
  amounts: TaxableAmount[],
  now = new Date(),
): TaxAmount[] {
  return amounts.map((amount) => {
    const destinationRule = activeRule(
      rules,
      destinationCountry,
      amount.categoryKey,
      now,
    );
    const swedishRule = activeRule(rules, "SE", amount.categoryKey, now);
    const rule =
      settings.euMode === "SWEDISH_ORIGIN" && destinationRule
        ? swedishRule
        : destinationRule;
    const rateBasisPoints =
      rule?.rateBasisPoints ?? settings.exportRateBasisPoints;
    if (amount.priceIncludesVat) {
      const taxAmount = ratioMinorAmount(
        amount.amount,
        rateBasisPoints,
        10_000 + rateBasisPoints,
      );
      return {
        id: amount.id,
        categoryKey: amount.categoryKey,
        rateBasisPoints,
        netAmount: amount.amount - taxAmount,
        taxAmount,
        grossAmount: amount.amount,
        ruleId: rule?.id ?? null,
      };
    }
    const taxAmount = ratioMinorAmount(amount.amount, rateBasisPoints, 10_000);
    return {
      id: amount.id,
      categoryKey: amount.categoryKey,
      rateBasisPoints,
      netAmount: amount.amount,
      taxAmount,
      grossAmount: sumMinorAmounts([amount.amount, taxAmount]),
      ruleId: rule?.id ?? null,
    };
  });
}
