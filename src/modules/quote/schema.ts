import type { Currency, PricingContext } from "@/modules/currency/schema";
import type { DiscountDefinition } from "@/modules/discount/schema";
import type { ShippingQuote, ShippingZone } from "@/modules/shipping/schema";
import type { TaxRule, TaxSettings } from "@/modules/tax/schema";

export type QuoteLineInput = {
  id: string;
  productId: string;
  collectionIds: string[];
  unitAmount: number;
  quantity: number;
  unitWeightGrams: number | null;
  shippingClassKey: string;
  taxCategoryKey: string;
  valid: boolean;
};

export type QuoteConfiguration = {
  shippingZones: ShippingZone[];
  packagingWeightGrams: number;
  taxSettings: TaxSettings;
  taxRules: TaxRule[];
  discounts: DiscountDefinition[];
};

export type CanonicalQuote = {
  destinationCountry: string;
  destinationSupported: boolean;
  merchandiseAmount: number;
  discountCode: string | null;
  discountName: string | null;
  discountAmount: number;
  discountMessage: string | null;
  merchandiseNetAmount: number;
  merchandiseTaxAmount: number;
  merchandiseGrossAmount: number;
  shipping: ShippingQuote | null;
  shippingNetAmount: number;
  shippingTaxAmount: number;
  shippingGrossAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRates: number[];
  taxRuleIds: string[];
  taxReviewRequired: boolean;
  taxMessage: string;
  weightGrams: number | null;
};

export type DisplayQuote = Omit<
  CanonicalQuote,
  | "merchandiseAmount"
  | "discountAmount"
  | "merchandiseNetAmount"
  | "merchandiseTaxAmount"
  | "merchandiseGrossAmount"
  | "shippingNetAmount"
  | "shippingTaxAmount"
  | "shippingGrossAmount"
  | "netAmount"
  | "taxAmount"
  | "totalAmount"
> & {
  currency: Currency;
  merchandiseAmount: number;
  discountAmount: number;
  merchandiseNetAmount: number;
  merchandiseTaxAmount: number;
  merchandiseGrossAmount: number;
  shippingNetAmount: number;
  shippingTaxAmount: number;
  shippingGrossAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type QuoteInput = {
  destinationCountry: string;
  discountCode: string | null;
  lines: QuoteLineInput[];
  configuration: QuoteConfiguration;
};

export type DisplayQuoteInput = {
  quote: CanonicalQuote;
  pricing: PricingContext;
  displayedMerchandiseAmount: number;
};
