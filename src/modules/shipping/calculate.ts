import { multiplyMinorAmount, sumMinorAmounts } from "@/modules/currency/money";
import type {
  ShippingInput,
  ShippingQuote,
  ShippingRateRule,
  ShippingZone,
} from "./schema";

function matches(rule: ShippingRateRule, input: ShippingInput) {
  const subtotal = input.subtotalAfterDiscount;
  return (
    rule.active &&
    subtotal >= rule.minSubtotal &&
    (rule.maxSubtotal === null || subtotal <= rule.maxSubtotal) &&
    (rule.packageClassKey === null ||
      rule.packageClassKey === input.packageClassKey) &&
    (input.weightGrams === null
      ? rule.minWeightGrams === 0 && rule.maxWeightGrams === null
      : input.weightGrams >= rule.minWeightGrams &&
        (rule.maxWeightGrams === null ||
          input.weightGrams <= rule.maxWeightGrams))
  );
}

function ruleAmount(rule: ShippingRateRule, quantity: number) {
  if (rule.calculationType === "FLAT") return rule.baseAmount;
  if (rule.calculationType === "PER_ITEM")
    return multiplyMinorAmount(rule.baseAmount, quantity);
  return sumMinorAmounts([
    rule.baseAmount,
    multiplyMinorAmount(rule.additionalItemAmount, Math.max(0, quantity - 1)),
  ]);
}

export function calculateShipping(
  zones: ShippingZone[],
  input: ShippingInput,
): ShippingQuote | null {
  const zone = zones.find(
    (item) =>
      item.active && item.countryCodes.includes(input.destinationCountry),
  );
  if (!zone) return null;
  const methods = zone.methods
    .filter((method) => method.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  for (const method of methods) {
    const rule = method.rules
      .filter((candidate) => matches(candidate, input))
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0];
    if (!rule) continue;
    const thresholdSubtotal =
      rule.thresholdBasis === "BEFORE_DISCOUNT"
        ? input.subtotalBeforeDiscount
        : input.subtotalAfterDiscount;
    const free =
      rule.freeShippingThreshold !== null &&
      thresholdSubtotal >= rule.freeShippingThreshold;
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      methodId: method.id,
      methodName: method.name,
      carrier: method.carrier,
      tracked: method.tracked,
      estimatedDelivery: method.estimatedDelivery,
      ruleId: rule.id,
      amount: free ? 0 : ruleAmount(rule, input.quantity),
      free,
      priceIncludesVat: rule.priceIncludesVat,
      taxCategoryKey: rule.shippingTaxCategoryKey,
    };
  }
  return null;
}
