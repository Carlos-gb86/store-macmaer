import { multiplyMinorAmount, sumMinorAmounts } from "@/modules/currency/money";
import { evaluateDiscount } from "@/modules/discount/calculate";
import { calculateShipping } from "@/modules/shipping/calculate";
import { calculateTaxAmounts } from "@/modules/tax/calculate";
import { displayAmount } from "@/modules/pricing/calculate";
import type {
  CanonicalQuote,
  DisplayQuote,
  DisplayQuoteInput,
  QuoteInput,
} from "./schema";

export function calculateQuote(input: QuoteInput): CanonicalQuote {
  const lines = input.lines.filter((line) => line.valid);
  const pricedLines = lines.map((line) => ({
    ...line,
    amount: multiplyMinorAmount(line.unitAmount, line.quantity),
  }));
  const merchandiseAmount = sumMinorAmounts(
    pricedLines.map((line) => line.amount),
  );
  const discount = evaluateDiscount(
    input.discountCode,
    input.configuration.discounts,
    pricedLines,
  );
  const discountedLines = pricedLines.map((line) => ({
    id: line.id,
    categoryKey: line.taxCategoryKey,
    amount: line.amount - (discount.allocations[line.id] ?? 0),
    priceIncludesVat: input.configuration.taxSettings.cataloguePricesIncludeVat,
  }));
  const subtotalAfterDiscount = merchandiseAmount - discount.amount;
  const allWeightsKnown = lines.every((line) => line.unitWeightGrams !== null);
  const weightGrams = allWeightsKnown
    ? sumMinorAmounts([
        ...lines.map((line) =>
          multiplyMinorAmount(line.unitWeightGrams ?? 0, line.quantity),
        ),
        input.configuration.packagingWeightGrams,
      ])
    : null;
  const classes = new Set(lines.map((line) => line.shippingClassKey));
  const packageClassKey =
    classes.size === 1 ? (classes.values().next().value ?? null) : null;
  const quantity = lines.reduce((total, line) => total + line.quantity, 0);
  const shipping = calculateShipping(input.configuration.shippingZones, {
    destinationCountry: input.destinationCountry,
    quantity,
    weightGrams,
    packageClassKey,
    subtotalBeforeDiscount: merchandiseAmount,
    subtotalAfterDiscount,
  });
  const taxable = [
    ...discountedLines,
    ...(shipping
      ? [
          {
            id: "shipping",
            categoryKey: shipping.taxCategoryKey,
            amount: shipping.amount,
            priceIncludesVat: shipping.priceIncludesVat,
          },
        ]
      : []),
  ];
  const taxAmounts = calculateTaxAmounts(
    input.configuration.taxSettings,
    input.configuration.taxRules,
    input.destinationCountry,
    taxable,
  );
  const merchandiseTax = taxAmounts.filter((item) => item.id !== "shipping");
  const shippingTax = taxAmounts.find((item) => item.id === "shipping");
  const merchandiseNetAmount = sumMinorAmounts(
    merchandiseTax.map((item) => item.netAmount),
  );
  const merchandiseTaxAmount = sumMinorAmounts(
    merchandiseTax.map((item) => item.taxAmount),
  );
  const merchandiseGrossAmount = sumMinorAmounts(
    merchandiseTax.map((item) => item.grossAmount),
  );
  const shippingNetAmount = shippingTax?.netAmount ?? 0;
  const shippingTaxAmount = shippingTax?.taxAmount ?? 0;
  const shippingGrossAmount = shippingTax?.grossAmount ?? 0;
  const taxRates = [
    ...new Set(taxAmounts.map((item) => item.rateBasisPoints)),
  ].sort((a, b) => a - b);
  const taxRuleIds = [
    ...new Set(
      taxAmounts
        .map((item) => item.ruleId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const usedRules = input.configuration.taxRules.filter((rule) =>
    taxRuleIds.includes(rule.id),
  );
  const taxReviewRequired =
    input.configuration.taxSettings.reviewedAt === null ||
    usedRules.some((rule) => rule.reviewedAt === null);
  const destinationSupported = input.configuration.shippingZones.some(
    (zone) =>
      zone.active && zone.countryCodes.includes(input.destinationCountry),
  );
  const isExport = taxRates.every((rate) => rate === 0);
  return {
    destinationCountry: input.destinationCountry,
    destinationSupported,
    merchandiseAmount,
    discountCode: discount.definition?.code ?? input.discountCode,
    discountName: discount.definition?.name ?? null,
    discountAmount: discount.amount,
    discountMessage: discount.message,
    merchandiseNetAmount,
    merchandiseTaxAmount,
    merchandiseGrossAmount,
    shipping,
    shippingNetAmount,
    shippingTaxAmount,
    shippingGrossAmount,
    netAmount: sumMinorAmounts([merchandiseNetAmount, shippingNetAmount]),
    taxAmount: sumMinorAmounts([merchandiseTaxAmount, shippingTaxAmount]),
    totalAmount: sumMinorAmounts([merchandiseGrossAmount, shippingGrossAmount]),
    taxRates,
    taxRuleIds,
    taxReviewRequired,
    taxMessage: isExport
      ? input.configuration.taxSettings.exportMessage
      : "VAT is included in the displayed total and calculated for the shipping destination.",
    weightGrams,
  };
}

export function displayQuote(input: DisplayQuoteInput): DisplayQuote {
  const convert = (amount: number) => displayAmount(amount, input.pricing);
  const merchandiseAmount = input.displayedMerchandiseAmount;
  const discountAmount = convert(input.quote.discountAmount);
  const shippingGrossAmount = convert(input.quote.shippingGrossAmount);
  const merchandiseTaxAmount = convert(input.quote.merchandiseTaxAmount);
  const shippingTaxAmount = convert(input.quote.shippingTaxAmount);
  const taxAmount = sumMinorAmounts([merchandiseTaxAmount, shippingTaxAmount]);
  const merchandiseGrossAmount = Math.max(
    0,
    merchandiseAmount - discountAmount,
  );
  const totalAmount = sumMinorAmounts([
    merchandiseGrossAmount,
    shippingGrossAmount,
  ]);
  const netAmount = totalAmount - taxAmount;
  return {
    ...input.quote,
    currency: input.pricing.currency,
    merchandiseAmount,
    discountAmount,
    merchandiseNetAmount: Math.max(
      0,
      merchandiseGrossAmount - merchandiseTaxAmount,
    ),
    merchandiseTaxAmount,
    merchandiseGrossAmount,
    shippingNetAmount: Math.max(0, shippingGrossAmount - shippingTaxAmount),
    shippingTaxAmount,
    shippingGrossAmount,
    netAmount,
    taxAmount,
    totalAmount,
  };
}
