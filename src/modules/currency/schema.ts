import { z } from "zod";

export const currencySchema = z.enum(["SEK", "EUR", "USD"]);
export type Currency = z.infer<typeof currencySchema>;

export type FxRate = {
  id: string;
  baseCurrency: "SEK";
  quoteCurrency: Exclude<Currency, "SEK">;
  numerator: bigint;
  denominator: bigint;
  source: string;
  effectiveAt: string;
  fetchedAt: string;
};

export type CurrencySetting = {
  code: Currency;
  enabled: boolean;
  sortOrder: number;
  markupBasisPoints: number;
  roundingIncrementMinor: number;
};

export type PricingContext = {
  currency: Currency;
  requestedCurrency: Currency;
  rate: FxRate | null;
  setting: CurrencySetting;
  availableCurrencies: Currency[];
  unavailableReason?: string;
};

export type ClientPricingContext = {
  currency: Currency;
  rate: null | {
    id: string;
    quoteCurrency: "EUR" | "USD";
    numerator: string;
    denominator: string;
  };
  markupBasisPoints: number;
  roundingIncrementMinor: number;
};

export function clientPricingContext(
  context: PricingContext,
): ClientPricingContext {
  return {
    currency: context.currency,
    rate: context.rate
      ? {
          id: context.rate.id,
          quoteCurrency: context.rate.quoteCurrency,
          numerator: context.rate.numerator.toString(),
          denominator: context.rate.denominator.toString(),
        }
      : null,
    markupBasisPoints: context.setting.markupBasisPoints,
    roundingIncrementMinor: context.setting.roundingIncrementMinor,
  };
}
