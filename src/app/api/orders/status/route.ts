import { ZodError } from "zod";
import { cookies } from "next/headers";
import { readOrderStatus } from "@/modules/checkout/repository";
import { checkoutStatusSchema, CheckoutError } from "@/modules/checkout/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = checkoutStatusSchema.parse(await request.json());
    const value = (await cookies()).get("macmaer_order_access")?.value;
    const prefix = `${input.orderId}.`;
    if (!value?.startsWith(prefix))
      throw new CheckoutError("Order not found.", 404);
    return Response.json(
      await readOrderStatus(input.orderId, value.slice(prefix.length)),
    );
  } catch (error) {
    const status =
      error instanceof CheckoutError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    return Response.json(
      {
        error:
          status === 500
            ? "Order status could not be loaded."
            : "Order not found.",
      },
      { status },
    );
  }
}
