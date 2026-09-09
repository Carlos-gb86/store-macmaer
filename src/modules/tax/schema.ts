export type TaxSettings = {
  euMode: "SWEDISH_ORIGIN" | "DESTINATION";
  cataloguePricesIncludeVat: boolean;
  exportRateBasisPoints: number;
  exportMessage: string;
  reviewedAt: string | null;
};

export type TaxRule = {
  id: string;
  countryCode: string;
  taxCategoryKey: string;
  rateBasisPoints: number;
  validFrom: string;
  validTo: string | null;
  enabled: boolean;
  source: string;
  reviewedAt: string | null;
};

export type TaxableAmount = {
  id: string;
  categoryKey: string;
  amount: number;
  priceIncludesVat: boolean;
};

export type TaxAmount = {
  id: string;
  categoryKey: string;
  rateBasisPoints: number;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  ruleId: string | null;
};
