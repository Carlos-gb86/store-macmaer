import { ZodError } from "zod";
import { quoteCheckout } from "@/modules/checkout/repository";
import { CheckoutError, quoteRequestSchema } from "@/modules/checkout/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = quoteRequestSchema.parse(await request.json());
    return Response.json(await quoteCheckout(input.country));
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
          ? (error.issues[0]?.message ?? "Check the destination.")
          : "The checkout total could not be calculated.";
    return Response.json({ error: message }, { status });
  }
}
