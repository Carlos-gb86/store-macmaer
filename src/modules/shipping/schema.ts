export type ShippingCalculationType =
  "FLAT" | "BASE_PLUS_ADDITIONAL" | "PER_ITEM";
export type ShippingThresholdBasis = "BEFORE_DISCOUNT" | "AFTER_DISCOUNT";

export type ShippingRateRule = {
  id: string;
  calculationType: ShippingCalculationType;
  baseAmount: number;
  additionalItemAmount: number;
  minWeightGrams: number;
  maxWeightGrams: number | null;
  minSubtotal: number;
  maxSubtotal: number | null;
  packageClassKey: string | null;
  freeShippingThreshold: number | null;
  thresholdBasis: ShippingThresholdBasis;
  priceIncludesVat: boolean;
  shippingTaxCategoryKey: string;
  active: boolean;
  priority: number;
};

export type ShippingMethod = {
  id: string;
  name: string;
  carrier: string | null;
  tracked: boolean;
  estimatedDelivery: string;
  active: boolean;
  sortOrder: number;
  rules: ShippingRateRule[];
};

export type ShippingZone = {
  id: string;
  key: string;
  name: string;
  active: boolean;
  sortOrder: number;
  countryCodes: string[];
  methods: ShippingMethod[];
};

export type ShippingInput = {
  destinationCountry: string;
  quantity: number;
  weightGrams: number | null;
  packageClassKey: string | null;
  subtotalBeforeDiscount: number;
  subtotalAfterDiscount: number;
};

export type ShippingQuote = {
  zoneId: string;
  zoneName: string;
  methodId: string;
  methodName: string;
  carrier: string | null;
  tracked: boolean;
  estimatedDelivery: string;
  ruleId: string;
  amount: number;
  free: boolean;
  priceIncludesVat: boolean;
  taxCategoryKey: string;
};
