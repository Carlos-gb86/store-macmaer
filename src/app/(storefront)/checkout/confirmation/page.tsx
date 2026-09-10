import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { OrderStatus } from "@/components/checkout/order-status";
import { readOrderStatus } from "@/modules/checkout/repository";

export const metadata: Metadata = { title: "Order confirmation" };

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  if (!order) notFound();
  const value = (await cookies()).get("macmaer_order_access")?.value;
  const prefix = `${order}.`;
  if (!value?.startsWith(prefix)) notFound();
  const status = await readOrderStatus(order, value.slice(prefix.length)).catch(
    () => null,
  );
  if (!status) notFound();
  return (
    <Container className="page-section confirmation-page">
      <OrderStatus orderId={order} initial={status} />
    </Container>
  );
}
