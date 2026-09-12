import { AccessError } from "@/modules/admin/result";
import { requireAdmin } from "@/modules/admin/auth";
import { csvDocument, decimalAmount } from "@/modules/orders/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { client } = await requireAdmin();
    const url = new URL(request.url);
    let query = client
      .from("orders")
      .select(
        "id,order_number,created_at,paid_at,status,payment_status,fulfilment_status,destination_country,currency,net_amount,tax_amount,total_amount,discount_amount,shipping_net_amount,shipping_tax_amount,shipping_gross_amount",
      )
      .order("created_at")
      .limit(5000);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from))
      query = query.gte("created_at", `${from}T00:00:00Z`);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const through = new Date(`${to}T00:00:00Z`);
      through.setUTCDate(through.getUTCDate() + 1);
      query = query.lt("created_at", through.toISOString());
    }
    const { data: orders, error } = await query;
    if (error) throw error;
    const refunds = new Map<string, number>();
    const paymentIntents = new Map<string, string>();
    const items = new Map<
      string,
      {
        product_title: string;
        sku: string | null;
        quantity: number;
        net_amount: number;
        tax_amount: number;
        gross_amount: number;
        discount_amount: number;
        tax_rate_basis_points: number;
      }[]
    >();
    for (let offset = 0; offset < orders.length; offset += 200) {
      const ids = orders.slice(offset, offset + 200).map((order) => order.id);
      if (!ids.length) continue;
      const [itemResult, refundResult, paymentResult] = await Promise.all([
        client
          .from("order_items")
          .select(
            "order_id,product_title,sku,quantity,net_amount,tax_amount,gross_amount,discount_amount,tax_rate_basis_points",
          )
          .in("order_id", ids)
          .order("created_at"),
        client
          .from("refunds")
          .select("order_id,amount")
          .in("order_id", ids)
          .eq("status", "SUCCEEDED"),
        client
          .from("payments")
          .select("order_id,stripe_payment_intent_id")
          .in("order_id", ids),
      ]);
      if (itemResult.error) throw itemResult.error;
      if (refundResult.error) throw refundResult.error;
      if (paymentResult.error) throw paymentResult.error;
      for (const item of itemResult.data) {
        const current = items.get(item.order_id) ?? [];
        current.push(item);
        items.set(item.order_id, current);
      }
      for (const refund of refundResult.data)
        refunds.set(
          refund.order_id,
          (refunds.get(refund.order_id) ?? 0) + refund.amount,
        );
      for (const payment of paymentResult.data)
        if (payment.stripe_payment_intent_id)
          paymentIntents.set(
            payment.order_id,
            payment.stripe_payment_intent_id,
          );
    }
    const rows: (string | number | null)[][] = [
      [
        "order_number",
        "order_date",
        "paid_at",
        "order_status",
        "payment_status",
        "fulfilment_status",
        "destination_country",
        "currency",
        "line_type",
        "description",
        "sku",
        "quantity",
        "tax_rate_percent",
        "line_net",
        "line_tax",
        "line_gross",
        "line_discount",
        "order_discount",
        "shipping_net",
        "shipping_tax",
        "shipping_gross",
        "order_net",
        "order_tax",
        "order_total",
        "confirmed_refunds",
        "stripe_payment_intent_id",
      ],
    ];
    for (const order of orders) {
      for (const item of items.get(order.id) ?? [])
        rows.push([
          order.order_number,
          order.created_at,
          order.paid_at,
          order.status,
          order.payment_status,
          order.fulfilment_status,
          order.destination_country,
          order.currency,
          "PRODUCT",
          item.product_title,
          item.sku,
          item.quantity,
          (item.tax_rate_basis_points / 100).toFixed(2),
          decimalAmount(item.net_amount),
          decimalAmount(item.tax_amount),
          decimalAmount(item.gross_amount - item.discount_amount),
          decimalAmount(item.discount_amount),
          decimalAmount(order.discount_amount),
          decimalAmount(order.shipping_net_amount),
          decimalAmount(order.shipping_tax_amount),
          decimalAmount(order.shipping_gross_amount),
          decimalAmount(order.net_amount),
          decimalAmount(order.tax_amount),
          decimalAmount(order.total_amount),
          decimalAmount(refunds.get(order.id) ?? 0),
          paymentIntents.get(order.id) ?? null,
        ]);
      const shippingRate =
        order.shipping_net_amount > 0
          ? (
              (order.shipping_tax_amount / order.shipping_net_amount) *
              100
            ).toFixed(2)
          : "0.00";
      rows.push([
        order.order_number,
        order.created_at,
        order.paid_at,
        order.status,
        order.payment_status,
        order.fulfilment_status,
        order.destination_country,
        order.currency,
        "SHIPPING",
        "Shipping",
        null,
        1,
        shippingRate,
        decimalAmount(order.shipping_net_amount),
        decimalAmount(order.shipping_tax_amount),
        decimalAmount(order.shipping_gross_amount),
        decimalAmount(0),
        decimalAmount(order.discount_amount),
        decimalAmount(order.shipping_net_amount),
        decimalAmount(order.shipping_tax_amount),
        decimalAmount(order.shipping_gross_amount),
        decimalAmount(order.net_amount),
        decimalAmount(order.tax_amount),
        decimalAmount(order.total_amount),
        decimalAmount(refunds.get(order.id) ?? 0),
        paymentIntents.get(order.id) ?? null,
      ]);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csvDocument(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="macmaer-orders-${stamp}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AccessError)
      return new Response("Administrator access required.", {
        status: error.code === "unauthorized" ? 401 : 403,
      });
    console.error("Order export failed", error);
    return new Response("The export could not be created.", { status: 500 });
  }
}
