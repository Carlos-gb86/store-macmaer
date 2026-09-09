import { z } from "zod";

export const discountKindSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);
export type DiscountKind = z.infer<typeof discountKindSchema>;

export type DiscountDefinition = {
  id: string;
  code: string;
  name: string;
  kind: DiscountKind;
  percentageBasisPoints: number | null;
  fixedAmount: number | null;
  minimumSubtotal: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  totalUsageLimit: number | null;
  redeemedCount: number;
  perCustomerLimit: number | null;
  productIds: string[];
  collectionIds: string[];
};

export type DiscountableLine = {
  id: string;
  productId: string;
  collectionIds: string[];
  amount: number;
};

export type DiscountEvaluation = {
  definition: DiscountDefinition | null;
  amount: number;
  allocations: Record<string, number>;
  message: string | null;
};
