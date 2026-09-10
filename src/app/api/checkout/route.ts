import { ZodError } from "zod";
import { cookies } from "next/headers";
import { createCheckout } from "@/modules/checkout/repository";
import { CheckoutError } from "@/modules/checkout/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, ...result } = await createCheckout(
      await request.json(),
    );
    const cookieStore = await cookies();
    cookieStore.set(
      "macmaer_order_access",
      `${result.orderId}.${accessToken}`,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      },
    );
    return Response.json(result);
  } catch (error) {
    const status =
      error instanceof CheckoutError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof CheckoutError
        ? error.message
        : error instanceof ZodError
          ? (error.issues[0]?.message ?? "Check your checkout details.")
          : "Checkout could not be started. Please try again.";
    return Response.json({ error: message }, { status });
  }
}
