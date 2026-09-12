import { NextResponse } from "next/server";
import { getMiniCart } from "@/modules/cart/repository";

export const runtime = "nodejs";

export async function GET() {
  const cart = await getMiniCart();
  return NextResponse.json(cart, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
