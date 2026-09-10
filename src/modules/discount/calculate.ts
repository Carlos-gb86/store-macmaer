import { ratioMinorAmount, sumMinorAmounts } from "@/modules/currency/money";
import type {
  DiscountDefinition,
  DiscountEvaluation,
  DiscountableLine,
} from "./schema";

export function isDiscountEligible(
  line: DiscountableLine,
  discount: DiscountDefinition,
) {
  if (!discount.productIds.length && !discount.collectionIds.length)
    return true;
  return (
    discount.productIds.includes(line.productId) ||
    line.collectionIds.some((id) => discount.collectionIds.includes(id))
  );
}

export function allocateDiscount(
  amount: number,
  lines: DiscountableLine[],
): Record<string, number> {
  if (!lines.length || amount === 0) return {};
  const eligibleTotal = sumMinorAmounts(lines.map((line) => line.amount));
  if (eligibleTotal === 0) return {};
  const shares = lines.map((line, index) => {
    const numerator = BigInt(amount) * BigInt(line.amount);
    const denominator = BigInt(eligibleTotal);
    return {
      id: line.id,
      index,
      floor: Number(numerator / denominator),
      remainder: numerator % denominator,
    };
  });
  let remaining = amount - shares.reduce((sum, share) => sum + share.floor, 0);
  for (const share of [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  )) {
    if (remaining === 0) break;
    share.floor += 1;
    remaining -= 1;
  }
  return Object.fromEntries(shares.map((share) => [share.id, share.floor]));
}

export function evaluateDiscount(
  code: string | null,
  discounts: DiscountDefinition[],
  lines: DiscountableLine[],
  now = new Date(),
): DiscountEvaluation {
  if (!code)
    return { definition: null, amount: 0, allocations: {}, message: null };
  const normalized = code.trim().toUpperCase();
  const discount = discounts.find((item) => item.code === normalized);
  const unavailable = (message: string): DiscountEvaluation => ({
    definition: discount ?? null,
    amount: 0,
    allocations: {},
    message,
  });
  if (!discount || !discount.active)
    return unavailable("That discount code is not available.");
  const timestamp = now.getTime();
  if (
    (discount.startsAt && timestamp < new Date(discount.startsAt).getTime()) ||
    (discount.endsAt && timestamp >= new Date(discount.endsAt).getTime())
  )
    return unavailable("That discount code is not currently active.");
  if (
    discount.totalUsageLimit !== null &&
    discount.redeemedCount >= discount.totalUsageLimit
  )
    return unavailable("That discount code has reached its usage limit.");
  const subtotal = sumMinorAmounts(lines.map((line) => line.amount));
  if (subtotal < discount.minimumSubtotal)
    return unavailable("The cart does not meet this discount's minimum spend.");
  const eligible = lines.filter((line) => isDiscountEligible(line, discount));
  const eligibleTotal = sumMinorAmounts(eligible.map((line) => line.amount));
  if (!eligible.length || eligibleTotal === 0)
    return unavailable("That discount does not apply to these products.");
  const amount = Math.min(
    eligibleTotal,
    discount.kind === "PERCENTAGE"
      ? ratioMinorAmount(
          eligibleTotal,
          discount.percentageBasisPoints ?? 0,
          10_000,
        )
      : (discount.fixedAmount ?? 0),
  );
  return {
    definition: discount,
    amount,
    allocations: allocateDiscount(amount, eligible),
    message: null,
  };
}
