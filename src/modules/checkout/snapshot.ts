import {
  allocateDiscount,
  isDiscountEligible,
} from "@/modules/discount/calculate";
import { multiplyMinorAmount, sumMinorAmounts } from "@/modules/currency/money";
import { calculateTaxAmounts } from "@/modules/tax/calculate";
import type { CartLine } from "@/modules/cart/schema";
import type { DiscountDefinition } from "@/modules/discount/schema";
import type { DisplayQuote, QuoteConfiguration } from "@/modules/quote/schema";

export type OrderItemSnapshot = {
  cart_line_id: string;
  product_id: string;
  variant_id: string | null;
  product_title: string;
  product_slug: string;
  sku: string | null;
  image_path: string | null;
  selected_options: CartLine["options"];
  quantity: number;
  unit_amount: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  tax_amount: number;
  tax_rate_basis_points: number;
  tax_rule_id: string | null;
  tax_message_line: string;
};

function allocation(total: number, weighted: { id: string; amount: number }[]) {
  if (total === 0) return {};
  return allocateDiscount(
    total,
    weighted
      .filter((item) => item.amount > 0)
      .map((item) => ({ ...item, productId: item.id, collectionIds: [] })),
  );
}

export function buildOrderItemSnapshots(input: {
  lines: CartLine[];
  quote: DisplayQuote;
  configuration: QuoteConfiguration;
  discount: DiscountDefinition | null;
  now?: Date;
}): OrderItemSnapshot[] {
  const lines = input.lines.filter((line) => line.valid);
  const grossLines = lines.map((line) => ({
    id: line.id,
    amount: multiplyMinorAmount(line.displayUnitAmount, line.quantity),
  }));
  const eligibleGross = input.discount
    ? grossLines.filter((amount) => {
        const line = lines.find((candidate) => candidate.id === amount.id)!;
        return isDiscountEligible(
          {
            id: line.id,
            productId: line.productId,
            collectionIds: line.collectionIds,
            amount: amount.amount,
          },
          input.discount!,
        );
      })
    : [];
  const discounts = allocation(input.quote.discountAmount, eligibleGross);
  const taxable = lines.map((line) => {
    const gross = grossLines.find((item) => item.id === line.id)!.amount;
    return {
      id: line.id,
      categoryKey: line.taxCategoryKey,
      amount: gross - (discounts[line.id] ?? 0),
      priceIncludesVat:
        input.configuration.taxSettings.cataloguePricesIncludeVat,
    };
  });
  const preliminaryTax = calculateTaxAmounts(
    input.configuration.taxSettings,
    input.configuration.taxRules,
    input.quote.destinationCountry,
    taxable,
    input.now,
  );
  const taxes = allocation(
    input.quote.merchandiseTaxAmount,
    preliminaryTax.map((item) => ({ id: item.id, amount: item.taxAmount })),
  );
  const snapshots = lines.map((line) => {
    const gross = grossLines.find((item) => item.id === line.id)!.amount;
    const discount = discounts[line.id] ?? 0;
    const taxDetails = preliminaryTax.find((item) => item.id === line.id)!;
    const tax = taxes[line.id] ?? 0;
    return {
      cart_line_id: line.id,
      product_id: line.productId,
      variant_id: line.variantId,
      product_title: line.productTitle,
      product_slug: line.productSlug,
      sku: line.sku,
      image_path: line.imagePath,
      selected_options: line.options,
      quantity: line.quantity,
      unit_amount: line.displayUnitAmount,
      gross_amount: gross,
      discount_amount: discount,
      net_amount: gross - discount - tax,
      tax_amount: tax,
      tax_rate_basis_points: taxDetails.rateBasisPoints,
      tax_rule_id: taxDetails.ruleId,
      tax_message_line:
        taxDetails.rateBasisPoints === 0
          ? "No Macmaer-collected VAT"
          : `${taxDetails.rateBasisPoints / 100}% VAT included`,
    };
  });
  if (
    sumMinorAmounts(snapshots.map((item) => item.gross_amount)) !==
      input.quote.merchandiseAmount ||
    sumMinorAmounts(snapshots.map((item) => item.discount_amount)) !==
      input.quote.discountAmount ||
    sumMinorAmounts(snapshots.map((item) => item.tax_amount)) !==
      input.quote.merchandiseTaxAmount
  )
    throw new Error("Order item amounts do not reconcile with the quote.");
  return snapshots;
}
