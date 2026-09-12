import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../scripts/database.mjs";

let db: PGlite;
let orderId: string;
const adminId = "61000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  db = await createTestDatabase();
  await db.query("insert into auth.users(id,email) values($1,$2)", [
    adminId,
    "admin@macmaer.com",
  ]);
  await db.query("insert into private.admin_users(user_id) values($1)", [
    adminId,
  ]);
  await db
    .query(
      `insert into public.orders(
      order_number,checkout_attempt_id,access_token_hash,currency,customer_name,
      customer_email,customer_phone,email_identity_hash,phone_identity_hash,
      shipping_address,billing_address,destination_country,shipping_method_snapshot,
      policy_version_ids,merchandise_amount,discount_amount,merchandise_net_amount,
      merchandise_tax_amount,shipping_net_amount,shipping_tax_amount,shipping_gross_amount,
      net_amount,tax_amount,total_amount,terms_accepted_at,reservation_expires_at,
      status,payment_status,paid_at
    ) values(
      'MAC-2026-900001',gen_random_uuid(),$1,'SEK','Made To Order Buyer',
      'buyer@example.com','+46701234567',$2,$3,
      '{"name":"Buyer"}','{"name":"Buyer"}','SE','{}','{}',
      50000,0,40000,10000,6400,1600,8000,46400,11600,58000,now(),now()+interval '1 day',
      'PAID','SUCCEEDED',now()
    ) returning id`,
      ["a".repeat(64), "b".repeat(64), "c".repeat(64)],
    )
    .then((result) => {
      orderId = (result.rows[0] as { id: string }).id;
    });
  await db.query(
    "insert into public.payments(order_id,status,amount,currency,stripe_payment_intent_id) values($1,'SUCCEEDED',58000,'SEK','pi_phase6')",
    [orderId],
  );
}, 30_000);

afterAll(async () => db?.close());

async function asAdmin<T>(operation: () => Promise<T>) {
  await db.exec("begin; set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
    adminId,
  ]);
  try {
    const result = await operation();
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

describe("Phase 6 order operations", () => {
  it("enforces sequential made-to-order fulfilment and tracking", async () => {
    await expect(
      asAdmin(() =>
        db.query("select public.admin_set_fulfilment($1,'SHIPPED')", [orderId]),
      ),
    ).rejects.toThrow(/Invalid fulfilment transition/);
    await asAdmin(async () => {
      await db.query("select public.admin_set_fulfilment($1,'PROCESSING')", [
        orderId,
      ]);
      await db.query("select public.admin_set_fulfilment($1,'READY_TO_SHIP')", [
        orderId,
      ]);
    });
    await expect(
      asAdmin(() =>
        db.query("select public.admin_set_fulfilment($1,'SHIPPED')", [orderId]),
      ),
    ).rejects.toThrow(/tracking number/i);
    await asAdmin(() =>
      db.query(
        "select public.admin_set_fulfilment($1,'SHIPPED','POSTNORD','TRACK-123',$2)",
        [orderId, "https://example.com/track/TRACK-123"],
      ),
    );
    expect(
      (
        await db.query(
          "select fulfilment_status,status from public.orders where id=$1",
          [orderId],
        )
      ).rows[0],
    ).toEqual({ fulfilment_status: "SHIPPED", status: "SHIPPED" });
  });

  it("records notes without exposing the operations tables anonymously", async () => {
    await asAdmin(() =>
      db.query("select public.admin_add_order_note($1,$2)", [
        orderId,
        "Handle the custom finish with care.",
      ]),
    );
    expect(
      (await db.query("select note from public.order_internal_notes")).rows[0],
    ).toEqual({
      note: "Handle the custom finish with care.",
    });
    for (const table of [
      "refunds",
      "order_internal_notes",
      "email_deliveries",
    ]) {
      await db.exec("begin; set local role anon");
      try {
        await expect(db.query(`select * from public.${table}`)).rejects.toThrow(
          /permission denied/,
        );
      } finally {
        await db.exec("rollback");
      }
    }
  });

  it("keeps refund state provider-authoritative and webhook-idempotent", async () => {
    const requestKey = "62000000-0000-4000-8000-000000000001";
    const refundId = await asAdmin(async () => {
      const first = await db.query<{ admin_prepare_refund: string }>(
        "select public.admin_prepare_refund($1,$2,8000,'REQUESTED_BY_CUSTOMER',$3)",
        [orderId, requestKey, "Customer request"],
      );
      const replay = await db.query<{ admin_prepare_refund: string }>(
        "select public.admin_prepare_refund($1,$2,8000,'REQUESTED_BY_CUSTOMER',$3)",
        [orderId, requestKey, "Customer request"],
      );
      expect(replay.rows[0]!.admin_prepare_refund).toBe(
        first.rows[0]!.admin_prepare_refund,
      );
      return first.rows[0]!.admin_prepare_refund;
    });
    expect(
      (
        await db.query("select status from public.refunds where id=$1", [
          refundId,
        ])
      ).rows[0],
    ).toEqual({ status: "REQUESTED" });

    await db.exec("begin; set local role service_role");
    try {
      await db.query("select public.checkout_set_refund_provider($1,$2,$3)", [
        refundId,
        "re_phase6",
        "pending",
      ]);
      const first = await db.query<{ checkout_process_refund_event: string }>(
        "select public.checkout_process_refund_event($1,$2,$3,$4,$5,$6,$7)",
        [
          "evt_refund_phase6",
          "refund.updated",
          "re_phase6",
          orderId,
          refundId,
          "succeeded",
          null,
        ],
      );
      const replay = await db.query<{ checkout_process_refund_event: string }>(
        "select public.checkout_process_refund_event($1,$2,$3,$4,$5,$6,$7)",
        [
          "evt_refund_phase6",
          "refund.updated",
          "re_phase6",
          orderId,
          refundId,
          "succeeded",
          null,
        ],
      );
      expect(first.rows[0]!.checkout_process_refund_event).toBe("PROCESSED");
      expect(replay.rows[0]!.checkout_process_refund_event).toBe("DUPLICATE");
      await db.query(
        "select public.checkout_process_refund_event($1,$2,$3,$4,$5,$6,$7)",
        [
          "evt_refund_phase6_delayed",
          "refund.created",
          "re_phase6",
          orderId,
          refundId,
          "pending",
          null,
        ],
      );
      await db.query("select public.checkout_set_refund_provider($1,$2,$3)", [
        refundId,
        "re_phase6",
        "succeeded",
      ]);
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
    expect(
      (
        await db.query(
          "select status,payment_status,fulfilment_status from public.orders where id=$1",
          [orderId],
        )
      ).rows[0],
    ).toEqual({
      status: "PARTIALLY_REFUNDED",
      payment_status: "PARTIALLY_REFUNDED",
      fulfilment_status: "SHIPPED",
    });
    expect(
      (
        await db.query(
          "select status,provider_status from public.refunds where id=$1",
          [refundId],
        )
      ).rows[0],
    ).toEqual({ status: "SUCCEEDED", provider_status: "succeeded" });
  });

  it("marks a fully refunded order without losing its shipping state", async () => {
    const refundId = await asAdmin(async () => {
      const result = await db.query<{ admin_prepare_refund: string }>(
        "select public.admin_prepare_refund($1,$2,50000,'OTHER',null)",
        [orderId, "62000000-0000-4000-8000-000000000002"],
      );
      return result.rows[0]!.admin_prepare_refund;
    });
    await db.exec("begin; set local role service_role");
    try {
      await db.query("select public.checkout_set_refund_provider($1,$2,$3)", [
        refundId,
        "re_phase6_full",
        "pending",
      ]);
      await db.query(
        "select public.checkout_process_refund_event($1,$2,$3,$4,$5,$6,$7)",
        [
          "evt_refund_phase6_full",
          "refund.updated",
          "re_phase6_full",
          orderId,
          refundId,
          "succeeded",
          null,
        ],
      );
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
    expect(
      (
        await db.query(
          "select status,payment_status,fulfilment_status from public.orders where id=$1",
          [orderId],
        )
      ).rows[0],
    ).toEqual({
      status: "REFUNDED",
      payment_status: "REFUNDED",
      fulfilment_status: "SHIPPED",
    });
  });
});
