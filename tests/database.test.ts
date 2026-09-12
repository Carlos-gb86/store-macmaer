import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../scripts/database.mjs";
import { catalogueSchema } from "@/modules/catalog/schema";
let db: PGlite;
beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function asRole<T>(
  role: "anon" | "authenticated",
  operation: () => Promise<T>,
): Promise<T> {
  await db.exec("begin; set local role " + role);
  try {
    return await operation();
  } finally {
    await db.exec("rollback");
  }
}
describe("PostgreSQL migrations and RLS", () => {
  it("keeps contact enquiries behind the server boundary", async () => {
    await expect(
      asRole("anon", () => db.query("select * from public.contact_messages")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec(
        "insert into public.contact_messages(first_name,last_name,email,message,sender_hash) values ('A','B','a@example.com','Too short',repeat('a',64))",
      ),
    ).rejects.toThrow(/check constraint/);
  });
  it("keeps anonymous cart and FX records behind the server boundary", async () => {
    await expect(
      asRole("anon", () => db.query("select * from public.carts")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("anon", () => db.query("select * from public.currency_rates")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("insert into public.carts(token_hash) values ('short')"),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "insert into public.currency_rates(quote_currency,rate_numerator,rate_denominator,source,source_effective_at) values ('EUR',0,1,'test',now())",
      ),
    ).rejects.toThrow(/check constraint/);
  });
  it("seeds supported destinations and keeps commerce configuration private", async () => {
    expect(
      (await db.query("select * from public.shipping_zone_countries")).rows,
    ).toHaveLength(33);
    expect(
      (await db.query("select * from public.tax_rules")).rows,
    ).toHaveLength(21);
    expect(
      (
        await db.query(
          "select percentage_basis_points,per_customer_limit from public.discounts where code='MACMAER10'",
        )
      ).rows[0],
    ).toEqual({ percentage_basis_points: 1000, per_customer_limit: 1 });
    await expect(
      asRole("anon", () => db.query("select * from public.tax_rules")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole("anon", () => db.query("select * from public.discounts")),
    ).rejects.toThrow(/permission denied/);
  });
  it("enforces shipping, VAT and discount constraints in PostgreSQL", async () => {
    await expect(
      db.exec(
        "insert into public.shipping_rate_rules(method_id,base_amount,additional_item_amount,shipping_tax_category_key) values ('21000000-0000-4000-8000-000000000001',-1,0,'standard_goods')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "insert into public.tax_rules(country_code,tax_category_key,rate_basis_points,valid_from) values ('SE','standard_goods',10001,'2030-01-01')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "insert into public.discounts(code,name,kind,percentage_basis_points,active) values ('bad code','Bad','PERCENTAGE',1000,true)",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "insert into public.discount_redemptions(discount_id,redemption_key,email_identity_hash,amount,currency) values ('23000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000001',repeat('a',64),1000,'SEK')",
      ),
    ).rejects.toThrow(/not-null constraint/);
  });
  it("reads seeded products and generic configurations through the RLS view", async () => {
    await asRole("anon", async () => {
      const { rows } = await db.query<{ document: unknown }>(
        "select document from public.catalogue_products",
      );
      const collections = await db.query("select * from public.collections");
      const catalogue = catalogueSchema.parse({
        products: rows.map((row) => row.document),
        collections: JSON.parse(JSON.stringify(collections.rows)),
      });
      expect(catalogue.products).toHaveLength(6);
      expect(catalogue.collections).toHaveLength(4);
      expect(
        catalogue.products.find((p) => p.slug === "colour-accessory-pack")
          ?.options[0],
      ).toMatchObject({ repeat_count: 5, allow_duplicates: true });
      expect(
        catalogue.products.find((p) => p.slug === "velvet-knot")?.variants,
      ).toHaveLength(6);
      expect(catalogue.products.some((p) => p.status !== "active")).toBe(false);
      expect(
        (
          await db.query(
            "select * from public.tags where slug = 'private-sample'",
          )
        ).rows,
      ).toHaveLength(0);
    });
  });
  it.each(["anon"] as const)(
    "denies catalogue mutation by %s",
    async (role) => {
      await expect(
        asRole(role, () =>
          db.exec("update public.products set base_price = 1"),
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        asRole(role, () => db.exec("delete from public.product_images")),
      ).rejects.toThrow(/permission denied/);
      await expect(
        asRole(role, () =>
          db.exec(
            "insert into public.products (slug, title, base_price) values ('injected', 'Injected', 0)",
          ),
        ),
      ).rejects.toThrow(/permission denied/);
    },
  );
  it("RLS still blocks writes if table privileges are later accidentally broadened", async () => {
    await db.exec(
      "begin; grant insert, update, delete on public.products to anon; set local role anon",
    );
    try {
      expect(
        (
          await db.query(
            "update public.products set base_price = 1 returning id",
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("delete from public.products returning id")).rows,
      ).toHaveLength(0);
      await expect(
        db.exec(
          "insert into public.products (slug, title, base_price) values ('injected', 'Injected', 0)",
        ),
      ).rejects.toThrow(/row-level security/);
    } finally {
      await db.exec("rollback");
    }
  });
  it("hides child records when a product is archived", async () => {
    await db.exec(
      "begin; update public.products set status = 'archived' where slug = 'boucle-ball'; set local role anon",
    );
    try {
      for (const table of [
        "product_images",
        "product_options",
        "product_option_values",
        "product_variants",
        "variant_option_values",
        "product_collections",
        "product_tags",
      ]) {
        expect(
          (
            await db.query(
              "select * from public." +
                table +
                " where product_id = '00000000-0000-4000-8000-000000000001'",
            )
          ).rows,
        ).toHaveLength(0);
      }
    } finally {
      await db.exec("rollback");
    }
  });
  it("hides inactive collections, values, variants and their associations", async () => {
    await db.exec(
      "begin; update public.collections set active = false where slug = 'boucle'; update public.product_variants set active = false; update public.product_option_values set active = false; set local role anon",
    );
    try {
      expect(
        (
          await db.query(
            "select * from public.collections where slug = 'boucle'",
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("select * from public.product_variants")).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("select * from public.product_option_values")).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("select * from public.variant_option_values")).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            "select * from public.product_collections where collection_id = '00000000-0000-4000-8000-000000000020'",
          )
        ).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec("rollback");
    }
  });
  it("rejects invalid money and inventory records", async () => {
    await expect(
      db.exec(
        "insert into public.products (slug, title, base_price) values ('negative', 'Invalid', -1)",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "insert into public.products (slug, title, base_price, currency) values ('bad-currency', 'Invalid', 1, 'ZZZ')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "insert into public.products (slug, title, base_price, inventory_strategy) values ('no-stock', 'Invalid', 1, 'TRACKED')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.exec(
        "update public.product_variants set price_delta = 10 where price_override is not null",
      ),
    ).rejects.toThrow(/check constraint/);
  });
  it("prevents cross-product variant and option references", async () => {
    const { rows } = await db.query<{
      variant_id: string;
      product_id: string;
      option_id: string;
      value_id: string;
    }>("select * from public.variant_option_values limit 1");
    const row = rows[0]!;
    await expect(
      db.query(
        "insert into public.variant_option_values (variant_id, product_id, option_id, value_id) values ($1, $2, $3, $4)",
        [
          row.variant_id,
          "00000000-0000-4000-8000-000000000002",
          row.option_id,
          row.value_id,
        ],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.product_option_values (option_id, product_id, key, label) values ($1, $2, 'invalid', 'Invalid')",
        [row.option_id, "00000000-0000-4000-8000-000000000002"],
      ),
    ).rejects.toThrow(/foreign key constraint/);
  });
  it("allows one primary image per product and creates the restricted image bucket", async () => {
    await expect(
      db.exec(
        "insert into public.product_images (product_id, path, alt, width, height, is_primary) values ('00000000-0000-4000-8000-000000000001', 'a.jpg', 'Alt', 100, 100, true)",
      ),
    ).rejects.toThrow(/unique constraint/);
    const { rows } = await db.query<{ allowed_mime_types: string[] }>(
      "select allowed_mime_types from storage.buckets where id = 'catalogue'",
    );
    expect(rows[0]?.allowed_mime_types).not.toContain("image/svg+xml");
    expect(rows[0]?.allowed_mime_types).toContain("image/webp");
  });
});
