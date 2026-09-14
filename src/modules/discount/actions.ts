"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCart, setCartDiscountCode } from "@/modules/cart/repository";
import { quoteCart } from "@/modules/quote/repository";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { localizeCommerceMessage } from "@/modules/i18n/commerce";

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
    const locale = await getStorefrontLocale();
    const sv = locale === "sv";
    const code = codeSchema.parse(input);
    const cart = await getCart();
    if (!cart.id || !cart.lines.some((line) => line.valid))
      return {
        ok: false,
        message: sv
          ? "Lägg till en produkt innan du använder en kod."
          : "Add an item before applying a code.",
      };
    const quote = await quoteCart(cart, code);
    if (quote.discountMessage)
      return {
        ok: false,
        message:
          localizeCommerceMessage(quote.discountMessage, locale) ??
          quote.discountMessage,
      };
    await setCartDiscountCode(code);
    refresh();
    return {
      ok: true,
      message: sv ? `${code} har använts.` : `${code} applied.`,
    };
  } catch {
    return {
      ok: false,
      message:
        (await getStorefrontLocale()) === "sv"
          ? "Rabattkoden kunde inte användas."
          : "That discount code could not be applied.",
    };
  }
}

export async function removeDiscountCodeAction(): Promise<DiscountActionResult> {
  try {
    const sv = (await getStorefrontLocale()) === "sv";
    await setCartDiscountCode(null);
    refresh();
    return {
      ok: true,
      message: sv ? "Rabattkoden har tagits bort." : "Discount code removed.",
    };
  } catch {
    return {
      ok: false,
      message:
        (await getStorefrontLocale()) === "sv"
          ? "Rabattkoden kunde inte tas bort."
          : "The discount code could not be removed.",
    };
  }
}
