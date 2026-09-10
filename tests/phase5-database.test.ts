import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../scripts/database.mjs";

let db: PGlite;
const cartId = "31000000-0000-4000-8000-000000000001";
const attemptId = "32000000-0000-4000-8000-000000000001";
const variantId = "00000000-0000-4000-8000-000000000116";
const productId = "00000000-0000-4000-8000-000000000003";

function document(overrides: Record<string, unknown> = {}) {
  return {
    checkout_attempt_id: attemptId,
    access_token_hash: "a".repeat(64),
    cart_id: cartId,
    currency: "SEK",
    customer_name: "Test Buyer",
    customer_email: "buyer@example.com",
    customer_phone: "+46701234567",
    email_identity_hash: "b".repeat(64),
    phone_identity_hash: "c".repeat(64),
    shipping_address: { name: "Test Buyer", country: "SE" },
    billing_address: { name: "Test Buyer", country: "SE" },
    destination_country: "SE",
    shipping_method_snapshot: { id: "tracked", name: "Tracked delivery" },
    policy_version_ids: { terms: "draft" },
    merchandise_amount: 50_000,
    discount_amount: 5_000,
    merchandise_net_amount: 36_000,
    merchandise_tax_amount: 9_000,
    shipping_net_amount: 6_400,
    shipping_tax_amount: 1_600,
    shipping_gross_amount: 8_000,
    net_amount: 42_400,
    tax_amount: 10_600,
    total_amount: 53_000,
    discount_id: "23000000-0000-4000-8000-000000000001",
    discount_code: "MACMAER10",
    discount_name: "Macmaer 10%",
    fx_rate_id: null,
    tax_rule_ids: [],
    tax_rates_basis_points: [2500],
    tax_message: "VAT included.",
    terms_accepted_at: "2026-09-10T12:00:00Z",
    reservation_expires_at: "2099-09-10T12:30:00Z",
    items: [
      {
        cart_line_id: null,
        product_id: productId,
        variant_id: variantId,
        product_title: "Velvet knot",
        product_slug: "velvet-knot",
        sku: "VELVET-TEST",
        image_path: null,
        selected_options: [],
        quantity: 4,
        unit_amount: 12_500,
        gross_amount: 50_000,
        discount_amount: 5_000,
        net_amount: 36_000,
        tax_amount: 9_000,
        tax_rate_basis_points: 2500,
        tax_rule_id: null,
        tax_message_line: "25% VAT included",
      },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into public.carts(id,token_hash) values ($1,$2)", [
    cartId,
    "d".repeat(64),
  ]);
}, 30_000);

afterAll(async () => {
  await db?.close();
});

describe("Phase 5 order transaction", () => {
  it("creates one human-numbered order and reserves inventory and discount atomically", async () => {
    const first = await db.query<{ checkout_create_order: string }>(
      "select public.checkout_create_order($1::jsonb)",
      [JSON.stringify(document())],
    );
    const orderId = first.rows[0]!.checkout_create_order;
    const replay = await db.query<{ checkout_create_order: string }>(
      "select public.checkout_create_order($1::jsonb)",
      [JSON.stringify(document())],
    );
    expect(replay.rows[0]!.checkout_create_order).toBe(orderId);
    expect(
      (await db.query("select order_number from public.orders")).rows[0],
    ).toEqual({ order_number: "MAC-2026-000001" });
    expect(
      (
        await db.query(
          "select status,quantity from public.inventory_reservations",
        )
      ).rows[0],
    ).toEqual({ status: "ACTIVE", quantity: 4 });
    expect(
      (await db.query("select status from public.discount_redemptions"))
        .rows[0],
    ).toEqual({ status: "RESERVED" });
  });

  it("prevents another order from consuming reserved stock or the same customer discount", async () => {
    const secondCart = "31000000-0000-4000-8000-000000000002";
    await db.query("insert into public.carts(id,token_hash) values ($1,$2)", [
      secondCart,
      "e".repeat(64),
    ]);
    await expect(
      db.query("select public.checkout_create_order($1::jsonb)", [
        JSON.stringify(
          document({
            checkout_attempt_id: "32000000-0000-4000-8000-000000000002",
            cart_id: secondCart,
          }),
        ),
      ]),
    ).rejects.toThrow(/already used/i);
    expect(
      (await db.query("select count(*)::integer as count from public.orders"))
        .rows[0],
    ).toEqual({ count: 1 });
  });

  it("processes a successful Stripe event once and commits stock", async () => {
    const order = (
      await db.query<{ id: string }>("select id from public.orders")
    ).rows[0]!;
    await db.query("select public.checkout_set_payment_intent($1,$2)", [
      order.id,
      "pi_test_phase5",
    ]);
    const first = await db.query<{ checkout_process_stripe_event: string }>(
      "select public.checkout_process_stripe_event($1,$2,$3,$4,$5)",
      [
        "evt_phase5",
        "payment_intent.succeeded",
        "pi_test_phase5",
        order.id,
        null,
      ],
    );
    const replay = await db.query<{ checkout_process_stripe_event: string }>(
      "select public.checkout_process_stripe_event($1,$2,$3,$4,$5)",
      [
        "evt_phase5",
        "payment_intent.succeeded",
        "pi_test_phase5",
        order.id,
        null,
      ],
    );
    expect(first.rows[0]!.checkout_process_stripe_event).toBe("PROCESSED");
    expect(replay.rows[0]!.checkout_process_stripe_event).toBe("DUPLICATE");
    expect(
      (await db.query("select status,payment_status from public.orders"))
        .rows[0],
    ).toEqual({ status: "PAID", payment_status: "SUCCEEDED" });
    expect(
      (
        await db.query(
          "select stock_quantity from public.product_variants where id=$1",
          [variantId],
        )
      ).rows[0],
    ).toEqual({ stock_quantity: 0 });
    expect(
      (await db.query("select status from public.discount_redemptions"))
        .rows[0],
    ).toEqual({ status: "REDEEMED" });
  });

  it("keeps all order tables private from anonymous clients", async () => {
    for (const table of ["orders", "payments"]) {
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
});
