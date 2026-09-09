"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCart, setCartDiscountCode } from "@/modules/cart/repository";
import { quoteCart } from "@/modules/quote/repository";

export type DiscountActionResult = { ok: boolean; message: string };
const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .transform((value) => value.toUpperCase());

export async function applyDiscountCodeAction(
  input: unknown,
): Promise<DiscountActionResult> {
  try {
    const code = codeSchema.parse(input);
    const cart = await getCart();
    if (!cart.id || !cart.lines.some((line) => line.valid))
      return { ok: false, message: "Add an item before applying a code." };
    const quote = await quoteCart(cart, code);
    if (quote.discountMessage)
      return { ok: false, message: quote.discountMessage };
    await setCartDiscountCode(code);
    refresh();
    return { ok: true, message: `${code} applied.` };
  } catch {
    return { ok: false, message: "That discount code could not be applied." };
  }
}

export async function removeDiscountCodeAction(): Promise<DiscountActionResult> {
  try {
    await setCartDiscountCode(null);
    refresh();
    return { ok: true, message: "Discount code removed." };
  } catch {
    return { ok: false, message: "The discount code could not be removed." };
  }
}
