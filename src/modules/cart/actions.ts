"use server";
import { refresh } from "next/cache";
import { ZodError } from "zod";
import {
  addCartItem,
  removeCartItem,
  updateCartItemQuantity,
} from "./repository";
import {
  CartValidationError,
  updateCartItemSchema,
  type CartActionResult,
} from "./schema";
import { getStorefrontLocale } from "@/modules/i18n/server";

function message(error: unknown, sv: boolean) {
  if (error instanceof ZodError)
    return sv
      ? "Kontrollera uppgifterna i varukorgen."
      : (error.issues[0]?.message ?? "Check the cart details.");
  return error instanceof CartValidationError
    ? error.message
    : sv
      ? "Varukorgen kunde inte uppdateras. Försök igen."
      : "The cart could not be updated. Please try again.";
}

export async function addToCartAction(
  input: unknown,
): Promise<CartActionResult> {
  try {
    const sv = (await getStorefrontLocale()) === "sv";
    const itemCount = await addCartItem(input);
    refresh();
    return {
      ok: true,
      itemCount,
      message: sv ? "Tillagd i varukorgen." : "Added to your cart.",
    };
  } catch (error) {
    return {
      ok: false,
      message: message(error, (await getStorefrontLocale()) === "sv"),
    };
  }
}

export async function updateCartItemAction(
  input: unknown,
): Promise<CartActionResult> {
  try {
    const sv = (await getStorefrontLocale()) === "sv";
    const value = updateCartItemSchema.parse(input);
    const itemCount = await updateCartItemQuantity(
      value.lineId,
      value.quantity,
    );
    refresh();
    return {
      ok: true,
      itemCount,
      message: sv ? "Varukorgen har uppdaterats." : "Cart updated.",
    };
  } catch (error) {
    return {
      ok: false,
      message: message(error, (await getStorefrontLocale()) === "sv"),
    };
  }
}

export async function removeCartItemAction(
  lineId: string,
): Promise<CartActionResult> {
  try {
    const sv = (await getStorefrontLocale()) === "sv";
    const itemCount = await removeCartItem(lineId);
    refresh();
    return {
      ok: true,
      itemCount,
      message: sv ? "Artikeln har tagits bort." : "Item removed.",
    };
  } catch (error) {
    return {
      ok: false,
      message: message(error, (await getStorefrontLocale()) === "sv"),
    };
  }
}
