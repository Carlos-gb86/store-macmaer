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

function message(error: unknown) {
  if (error instanceof ZodError)
    return error.issues[0]?.message ?? "Check the cart details.";
  return error instanceof CartValidationError
    ? error.message
    : "The cart could not be updated. Please try again.";
}

export async function addToCartAction(
  input: unknown,
): Promise<CartActionResult> {
  try {
    const itemCount = await addCartItem(input);
    refresh();
    return { ok: true, itemCount, message: "Added to your cart." };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}

export async function updateCartItemAction(
  input: unknown,
): Promise<CartActionResult> {
  try {
    const value = updateCartItemSchema.parse(input);
    const itemCount = await updateCartItemQuantity(
      value.lineId,
      value.quantity,
    );
    refresh();
    return { ok: true, itemCount, message: "Cart updated." };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}

export async function removeCartItemAction(
  lineId: string,
): Promise<CartActionResult> {
  try {
    const itemCount = await removeCartItem(lineId);
    refresh();
    return { ok: true, itemCount, message: "Item removed." };
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}
