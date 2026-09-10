import { describe, expect, it } from "vitest";
import { buildOrderItemSnapshots } from "@/modules/checkout/snapshot";
import { normalizeEmail, normalizePhone } from "@/modules/checkout/repository";
import type { CartLine } from "@/modules/cart/schema";
import type { DisplayQuote, QuoteConfiguration } from "@/modules/quote/schema";

const configuration: QuoteConfiguration = {
  packagingWeightGrams: 0,
  shippingZones: [],
  discounts: [],
  taxSettings: {
    euMode: "DESTINATION",
    cataloguePricesIncludeVat: true,
    exportRateBasisPoints: 0,
    exportMessage: "Import charges may apply.",
    reviewedAt: "2026-09-10T00:00:00Z",
  },
  taxRules: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      countryCode: "SE",
      taxCategoryKey: "standard_goods",
      rateBasisPoints: 2500,
      validFrom: "2026-01-01",
      validTo: null,
      enabled: true,
      source: "test",
      reviewedAt: "2026-09-10T00:00:00Z",
    },
  ],
};

function line(id: string, amount: number): CartLine {
  return {
    id,
    productId: id,
    variantId: null,
    productTitle: `Product ${id}`,
    productSlug: `product-${id}`,
    sku: null,
    imagePath: null,
    options: [],
    quantity: 1,
    baseUnitAmount: amount,
    displayUnitAmount: amount,
    displayCurrency: "SEK",
    taxCategoryKey: "standard_goods",
    shippingClassKey: "standard",
    collectionIds: [],
    unitWeightGrams: null,
    valid: true,
    message: null,
  };
}

describe("Phase 5 checkout snapshots", () => {
  it("normalizes discount identities consistently", () => {
    expect(normalizeEmail("  BUYER@Example.COM ")).toBe("buyer@example.com");
    expect(normalizePhone("+46 (0)70-123 45 67")).toBe("+460701234567");
  });

  it("reconciles every discount and VAT minor unit to the order totals", () => {
    const quote = {
      destinationCountry: "SE",
      merchandiseAmount: 30_003,
      discountAmount: 3_000,
      merchandiseTaxAmount: 5_401,
    } as DisplayQuote;
    const discount = {
      id: "discount",
      code: "MACMAER10",
      name: "Macmaer 10%",
      kind: "PERCENTAGE" as const,
      percentageBasisPoints: 1000,
      fixedAmount: null,
      minimumSubtotal: 0,
      startsAt: null,
      endsAt: null,
      active: true,
      totalUsageLimit: null,
      redeemedCount: 0,
      perCustomerLimit: 1,
      productIds: [],
      collectionIds: [],
    };
    const items = buildOrderItemSnapshots({
      lines: [
        line("10000000-0000-4000-8000-000000000011", 10_001),
        line("10000000-0000-4000-8000-000000000012", 20_002),
      ],
      quote,
      configuration,
      discount,
      now: new Date("2026-09-10T00:00:00Z"),
    });
    expect(items.reduce((sum, item) => sum + item.gross_amount, 0)).toBe(
      30_003,
    );
    expect(items.reduce((sum, item) => sum + item.discount_amount, 0)).toBe(
      3_000,
    );
    expect(items.reduce((sum, item) => sum + item.tax_amount, 0)).toBe(5_401);
    expect(
      items.every(
        (item) =>
          item.net_amount + item.tax_amount ===
          item.gross_amount - item.discount_amount,
      ),
    ).toBe(true);
  });
});
