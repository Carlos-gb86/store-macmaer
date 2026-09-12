import "server-only";

import { notFound } from "next/navigation";
import { requireAdminPage } from "@/modules/admin/auth";
import type { Database } from "@/lib/supabase/database.types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export type OrderFilters = {
  q: string;
  status: string;
  payment: string;
  fulfilment: string;
  country: string;
  from: string;
  to: string;
  page: number;
};

export function parseOrderFilters(
  params: Record<string, string | string[] | undefined>,
): OrderFilters {
  const stringValue = (key: string) =>
    typeof params[key] === "string" ? params[key] : "";
  return {
    q: stringValue("q")
      .replaceAll(/[^\p{L}\p{N}@._+\s-]/gu, "")
      .slice(0, 100),
    status: stringValue("status"),
    payment: stringValue("payment"),
    fulfilment: stringValue("fulfilment"),
    country: stringValue("country").toUpperCase().slice(0, 2),
    from: /^\d{4}-\d{2}-\d{2}$/.test(stringValue("from"))
      ? stringValue("from")
      : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(stringValue("to")) ? stringValue("to") : "",
    page: Math.max(1, Math.min(100000, Number(stringValue("page")) || 1)),
  };
}

const orderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
] as const;
const paymentStatuses = [
  "NOT_STARTED",
  "REQUIRES_PAYMENT",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
] as const;
const fulfilmentStatuses = [
  "UNFULFILLED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export async function listAdminOrders(filters: OrderFilters) {
  const { client } = await requireAdminPage();
  let query = client
    .from("orders")
    .select(
      "id,order_number,status,payment_status,fulfilment_status,currency,total_amount,customer_name,customer_email,destination_country,created_at,paid_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id")
    .range((filters.page - 1) * 30, filters.page * 30 - 1);
  if (filters.q)
    query = query.or(
      `order_number.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,customer_email.ilike.%${filters.q}%`,
    );
  if (orderStatuses.includes(filters.status as (typeof orderStatuses)[number]))
    query = query.eq(
      "status",
      filters.status as (typeof orderStatuses)[number],
    );
  if (
    paymentStatuses.includes(
      filters.payment as (typeof paymentStatuses)[number],
    )
  )
    query = query.eq(
      "payment_status",
      filters.payment as (typeof paymentStatuses)[number],
    );
  if (
    fulfilmentStatuses.includes(
      filters.fulfilment as (typeof fulfilmentStatuses)[number],
    )
  )
    query = query.eq(
      "fulfilment_status",
      filters.fulfilment as (typeof fulfilmentStatuses)[number],
    );
  if (/^[A-Z]{2}$/.test(filters.country))
    query = query.eq("destination_country", filters.country);
  if (filters.from)
    query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) {
    const through = new Date(`${filters.to}T00:00:00Z`);
    through.setUTCDate(through.getUTCDate() + 1);
    query = query.lt("created_at", through.toISOString());
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data, count: count ?? 0 };
}

export async function getAdminOrder(id: string) {
  const { client } = await requireAdminPage();
  const [order, items, payment, fulfilment, refunds, events, notes, emails] =
    await Promise.all([
      client.from("orders").select().eq("id", id).maybeSingle(),
      client
        .from("order_items")
        .select()
        .eq("order_id", id)
        .order("created_at"),
      client.from("payments").select().eq("order_id", id).maybeSingle(),
      client
        .from("order_fulfilments")
        .select()
        .eq("order_id", id)
        .maybeSingle(),
      client.from("refunds").select().eq("order_id", id).order("created_at"),
      client
        .from("order_events")
        .select()
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      client
        .from("order_internal_notes")
        .select()
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      client
        .from("email_deliveries")
        .select()
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
    ]);
  const failed = [
    order,
    items,
    payment,
    fulfilment,
    refunds,
    events,
    notes,
    emails,
  ].find((result) => result.error);
  if (failed?.error) throw failed.error;
  if (!order.data) notFound();
  return {
    order: order.data,
    items: items.data!,
    payment: payment.data,
    fulfilment: fulfilment.data,
    refunds: refunds.data!,
    events: events.data!,
    notes: notes.data!,
    emails: emails.data!,
  };
}
