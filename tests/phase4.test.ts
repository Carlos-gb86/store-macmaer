import { describe, expect, it } from "vitest";
import { getDemoCatalogue } from "@/modules/catalog/demo";
import {
  allocateDiscount,
  evaluateDiscount,
} from "@/modules/discount/calculate";
import type { DiscountDefinition } from "@/modules/discount/schema";
import { calculateQuote, displayQuote } from "@/modules/quote/calculate";
import type {
  QuoteConfiguration,
  QuoteLineInput,
} from "@/modules/quote/schema";
import { calculateShipping } from "@/modules/shipping/calculate";
import type { ShippingRateRule, ShippingZone } from "@/modules/shipping/schema";
import { calculateUnitWeight } from "@/modules/shipping/weight";
import { calculateTaxAmounts } from "@/modules/tax/calculate";
import type { TaxSettings } from "@/modules/tax/schema";
import type { PricingContext } from "@/modules/currency/schema";

const taxSettings: TaxSettings = {
  euMode: "DESTINATION",
  cataloguePricesIncludeVat: true,
  exportRateBasisPoints: 0,
  exportMessage: "Import charges may apply.",
  reviewedAt: "2026-09-09T00:00:00.000Z",
};
const taxRules = [
  {
    id: "tax-se",
    countryCode: "SE",
    taxCategoryKey: "standard_goods",
    rateBasisPoints: 2500,
    validFrom: "2026-01-01",
    validTo: null,
    enabled: true,
    source: "test",
    reviewedAt: "2026-09-09T00:00:00.000Z",
  },
  {
    id: "tax-de",
    countryCode: "DE",
    taxCategoryKey: "standard_goods",
    rateBasisPoints: 1900,
    validFrom: "2026-01-01",
    validTo: null,
    enabled: true,
    source: "test",
    reviewedAt: "2026-09-09T00:00:00.000Z",
  },
];
const baseRule: ShippingRateRule = {
  id: "rule",
  calculationType: "BASE_PLUS_ADDITIONAL",
  baseAmount: 25_000,
  additionalItemAmount: 8_000,
  minWeightGrams: 0,
  maxWeightGrams: null,
  minSubtotal: 0,
  maxSubtotal: null,
  packageClassKey: null,
  freeShippingThreshold: null,
  thresholdBasis: "AFTER_DISCOUNT",
  priceIncludesVat: false,
  shippingTaxCategoryKey: "standard_goods",
  active: true,
  priority: 0,
};
function zone(
  id: string,
  name: string,
  countries: string[],
  rule: ShippingRateRule,
): ShippingZone {
  return {
    id,
    key: id,
    name,
    active: true,
    sortOrder: 0,
    countryCodes: countries,
    methods: [
      {
        id: id + "-method",
        name: "Tracked delivery",
        carrier: null,
        tracked: true,
        estimatedDelivery: "3–5 days",
        active: true,
        sortOrder: 0,
        rules: [rule],
      },
    ],
  };
}
const discount: DiscountDefinition = {
  id: "discount",
  code: "MACMAER10",
  name: "Macmaer 10%",
  kind: "PERCENTAGE",
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
function configuration(): QuoteConfiguration {
  return {
    packagingWeightGrams: 100,
    taxSettings,
    taxRules,
    discounts: [discount],
    shippingZones: [
      zone("sweden", "Sweden", ["SE"], {
        ...baseRule,
        id: "se-rule",
        baseAmount: 8_000,
        additionalItemAmount: 0,
        priceIncludesVat: true,
      }),
      zone("eu", "EU VAT zone", ["DE"], {
        ...baseRule,
        id: "eu-rule",
        priceIncludesVat: true,
      }),
      zone("us", "United States", ["US"], {
        ...baseRule,
        id: "us-rule",
      }),
    ],
  };
}
function line(overrides: Partial<QuoteLineInput> = {}): QuoteLineInput {
  return {
    id: "line",
    productId: "product",
    collectionIds: [],
    unitAmount: 50_000,
    quantity: 1,
    unitWeightGrams: 500,
    shippingClassKey: "standard",
    taxCategoryKey: "standard_goods",
    valid: true,
    ...overrides,
  };
}

describe("destination VAT", () => {
  it("extracts Swedish VAT from the fixed customer selling price", () => {
    const result = calculateTaxAmounts(
      taxSettings,
      taxRules,
      "SE",
      [
        {
          id: "product",
          categoryKey: "standard_goods",
          amount: 50_000,
          priceIncludesVat: true,
        },
      ],
      new Date("2026-09-09T00:00:00Z"),
    )[0]!;
    expect(result).toMatchObject({
      netAmount: 40_000,
      taxAmount: 10_000,
      grossAmount: 50_000,
      rateBasisPoints: 2500,
    });
  });

  it("keeps the same non-EU selling price with zero EU VAT", () => {
    const result = calculateTaxAmounts(taxSettings, taxRules, "US", [
      {
        id: "product",
        categoryKey: "standard_goods",
        amount: 50_000,
        priceIncludesVat: true,
      },
    ])[0]!;
    expect(result).toMatchObject({
      netAmount: 50_000,
      taxAmount: 0,
      grossAmount: 50_000,
    });
  });

  it("adds VAT when an entered shipping fee is configured as net", () => {
    const result = calculateTaxAmounts(taxSettings, taxRules, "SE", [
      {
        id: "shipping",
        categoryKey: "standard_goods",
        amount: 25_000,
        priceIncludesVat: false,
      },
    ])[0]!;
    expect(result).toMatchObject({
      netAmount: 25_000,
      taxAmount: 6_250,
      grossAmount: 31_250,
    });
  });
});

describe("shipping rules", () => {
  it("supports adjustable base-plus-marginal quantity pricing", () => {
    const result = calculateShipping(
      [zone("world", "World", ["US"], baseRule)],
      {
        destinationCountry: "US",
        quantity: 3,
        weightGrams: 1500,
        packageClassKey: "standard",
        subtotalBeforeDiscount: 100_000,
        subtotalAfterDiscount: 90_000,
      },
    );
    expect(result?.amount).toBe(41_000);
  });

  it("uses configurable free-shipping basis and weight boundaries", () => {
    const rule = {
      ...baseRule,
      maxWeightGrams: 1000,
      freeShippingThreshold: 100_000,
      thresholdBasis: "BEFORE_DISCOUNT" as const,
    };
    const zones = [zone("world", "World", ["US"], rule)];
    expect(
      calculateShipping(zones, {
        destinationCountry: "US",
        quantity: 1,
        weightGrams: 1000,
        packageClassKey: "standard",
        subtotalBeforeDiscount: 100_000,
        subtotalAfterDiscount: 90_000,
      }),
    ).toMatchObject({ amount: 0, free: true });
    expect(
      calculateShipping(zones, {
        destinationCountry: "US",
        quantity: 1,
        weightGrams: 1001,
        packageClassKey: "standard",
        subtotalBeforeDiscount: 100_000,
        subtotalAfterDiscount: 90_000,
      }),
    ).toBeNull();
  });
});

describe("discounts and totals", () => {
  it("allocates every minor unit and respects product restrictions", () => {
    const lines = [
      { id: "a", productId: "a", collectionIds: [], amount: 101 },
      { id: "b", productId: "b", collectionIds: [], amount: 202 },
    ];
    expect(
      Object.values(allocateDiscount(30, lines)).reduce((a, b) => a + b),
    ).toBe(30);
    const restricted = evaluateDiscount(
      "MACMAER10",
      [{ ...discount, productIds: ["a"] }],
      lines,
    );
    expect(restricted.amount).toBe(10);
    expect(restricted.allocations).toEqual({ a: 10 });
  });

  it("calculates a reconciled Swedish quote after discount", () => {
    const quote = calculateQuote({
      destinationCountry: "SE",
      discountCode: "MACMAER10",
      lines: [line()],
      configuration: configuration(),
    });
    expect(quote).toMatchObject({
      merchandiseAmount: 50_000,
      discountAmount: 5_000,
      merchandiseGrossAmount: 45_000,
      merchandiseTaxAmount: 9_000,
      shippingGrossAmount: 8_000,
      shippingTaxAmount: 1_600,
      netAmount: 42_400,
      taxAmount: 10_600,
      totalAmount: 53_000,
      weightGrams: 600,
    });
  });

  it("quotes non-EU shipping without VAT and converts reconciled totals", () => {
    const quote = calculateQuote({
      destinationCountry: "US",
      discountCode: "MACMAER10",
      lines: [line()],
      configuration: configuration(),
    });
    expect(quote).toMatchObject({
      taxAmount: 0,
      shippingGrossAmount: 25_000,
      totalAmount: 70_000,
    });
    const pricing: PricingContext = {
      currency: "EUR",
      requestedCurrency: "EUR",
      availableCurrencies: ["SEK", "EUR"],
      setting: {
        code: "EUR",
        enabled: true,
        sortOrder: 1,
        markupBasisPoints: 0,
        roundingIncrementMinor: 1,
      },
      rate: {
        id: "rate",
        baseCurrency: "SEK",
        quoteCurrency: "EUR",
        numerator: 1n,
        denominator: 10n,
        source: "test",
        effectiveAt: "2026-09-09T00:00:00Z",
        fetchedAt: "2026-09-09T00:00:00Z",
      },
    };
    expect(
      displayQuote({
        quote,
        pricing,
        displayedMerchandiseAmount: 5_000,
      }),
    ).toMatchObject({
      merchandiseAmount: 5_000,
      discountAmount: 500,
      shippingGrossAmount: 2_500,
      totalAmount: 7_000,
      currency: "EUR",
    });
  });
});

describe("shipping weight", () => {
  it("uses variant overrides and repeated option weight adjustments", () => {
    const product = structuredClone(
      getDemoCatalogue().products.find(
        (item) => item.slug === "colour-accessory-pack",
      )!,
    );
    const option = product.options[0]!;
    option.affects_weight = true;
    option.values[0]!.weight_delta_grams = 10;
    const selected = Array<string>(5).fill(option.values[0]!.id);
    expect(calculateUnitWeight(product, { colours: selected })).toBe(550);
  });
});
