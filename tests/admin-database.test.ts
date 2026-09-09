import { beforeAll, afterAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../scripts/database.mjs";
import {
  newProduct,
  adminProductSchema,
  productInput,
} from "@/modules/admin/schema";
import { getDemoCatalogue } from "@/modules/catalog/demo";
let db: PGlite;
const admin = "10000000-0000-4000-8000-000000000001",
  ordinary = "10000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(
    await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into auth.users(id) values($1),($2)", [
    admin,
    ordinary,
  ]);
  await db.query("insert into private.admin_users(user_id) values($1)", [
    admin,
  ]);
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("publishes homepage fields and ordered memberships atomically", async () => {
  await asUser(admin, async () => {
    const row = (
      await db.query<{ document: { updated_at: string } }>(
        "select to_jsonb(h) document from public.homepage_content h",
      )
    ).rows[0]!.document;
    await db.query(
      "select public.admin_save_homepage($1::jsonb,$2::jsonb,$3::jsonb,$4::timestamptz)",
      [
        JSON.stringify({ ...row, hero_title: "Updated homepage" }),
        JSON.stringify(["00000000-0000-4000-8000-000000000001"]),
        JSON.stringify([]),
        row.updated_at,
      ],
    );
    expect(
      (await db.query("select hero_title from public.homepage_content"))
        .rows[0],
    ).toEqual({ hero_title: "Updated homepage" });
  });
});
it("updates all currency settings atomically for administrators only", async () => {
  const document = JSON.stringify([
    {
      code: "SEK",
      enabled: true,
      markup_basis_points: 0,
      rounding_increment_minor: 1,
    },
    {
      code: "EUR",
      enabled: false,
      markup_basis_points: 125,
      rounding_increment_minor: 100,
    },
    {
      code: "USD",
      enabled: true,
      markup_basis_points: 0,
      rounding_increment_minor: 1,
    },
  ]);
  await expect(
    asUser(ordinary, () =>
      db.query("select public.admin_save_currency_settings($1::jsonb)", [
        document,
      ]),
    ),
  ).rejects.toThrow(/Administrator/);
  await asUser(admin, async () => {
    await db.query("select public.admin_save_currency_settings($1::jsonb)", [
      document,
    ]);
    expect(
      (
        await db.query(
          "select enabled,markup_basis_points,rounding_increment_minor from public.store_currencies where code='EUR'",
        )
      ).rows[0],
    ).toEqual({
      enabled: false,
      markup_basis_points: 125,
      rounding_increment_minor: 100,
    });
  });
});
it("updates shipping, tax and discount configuration through admin-only transactions", async () => {
  const shipping = {
    packaging_weight_grams: 50,
    package_classes: [{ key: "standard", name: "Standard", active: true }],
    countries: [
      {
        country_code: "SE",
        zone_id: "30000000-0000-4000-8000-000000000001",
      },
    ],
    zones: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        key: "test_zone",
        name: "Test zone",
        active: true,
        sort_order: 0,
        methods: [
          {
            id: "31000000-0000-4000-8000-000000000001",
            name: "Test delivery",
            carrier: null,
            tracked: true,
            estimated_delivery: "Tomorrow",
            active: true,
            sort_order: 0,
            rules: [
              {
                id: "32000000-0000-4000-8000-000000000001",
                calculation_type: "BASE_PLUS_ADDITIONAL",
                base_amount: 8000,
                additional_item_amount: 2000,
                min_weight_grams: 0,
                max_weight_grams: null,
                min_subtotal: 0,
                max_subtotal: null,
                package_class_key: null,
                free_shipping_threshold: 100000,
                threshold_basis: "AFTER_DISCOUNT",
                price_includes_vat: true,
                shipping_tax_category_key: "standard_goods",
                active: true,
                priority: 0,
              },
            ],
          },
        ],
      },
    ],
  };
  await expect(
    asUser(ordinary, () =>
      db.query("select public.admin_save_shipping_settings($1::jsonb)", [
        JSON.stringify(shipping),
      ]),
    ),
  ).rejects.toThrow(/Administrator/);
  await asUser(admin, async () => {
    await db.query("select public.admin_save_shipping_settings($1::jsonb)", [
      JSON.stringify(shipping),
    ]);
    expect(
      (
        await db.query(
          "select base_amount,additional_item_amount from shipping_rate_rules where id='32000000-0000-4000-8000-000000000001'",
        )
      ).rows[0],
    ).toEqual({ base_amount: 8000, additional_item_amount: 2000 });
    await db.query("select public.admin_save_tax_settings($1::jsonb)", [
      JSON.stringify({
        eu_mode: "DESTINATION",
        catalogue_prices_include_vat: true,
        export_rate_basis_points: 0,
        export_message: "Import charges may apply.",
        reviewed_at: "2026-09-09T00:00:00.000Z",
        categories: [
          { key: "standard_goods", name: "Standard goods", active: true },
        ],
        rules: [],
      }),
    ]);
    expect(
      (
        await db.query(
          "select reviewed_at is not null reviewed from tax_settings",
        )
      ).rows[0],
    ).toEqual({ reviewed: true });
    await db.query("select public.admin_save_discounts($1::jsonb)", [
      JSON.stringify([
        {
          id: "23000000-0000-4000-8000-000000000001",
          code: "MACMAER10",
          name: "Macmaer 10%",
          kind: "PERCENTAGE",
          percentage_basis_points: 1200,
          fixed_amount: null,
          minimum_subtotal: 0,
          starts_at: null,
          ends_at: null,
          active: true,
          total_usage_limit: null,
          per_customer_limit: 1,
          product_ids: [],
          collection_ids: [],
        },
      ]),
    ]);
    expect(
      (
        await db.query(
          "select percentage_basis_points from discounts where code='MACMAER10'",
        )
      ).rows[0],
    ).toEqual({ percentage_basis_points: 1200 });
  });
});
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await db.exec("begin;set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
  try {
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}
const save = async (p: unknown, stamp: string | null = null) =>
  (
    await db.query<{ result: { id: string; updated_at: string } }>(
      "select public.admin_save_product($1::jsonb,$2::timestamptz) result",
      [JSON.stringify(p), stamp],
    )
  ).rows[0]!.result;
it("denies ordinary users and revoked administrators, including role self-assignment", async () => {
  await asUser(ordinary, async () => {
    expect(
      (await db.query("select * from public.media_assets")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("update public.products set base_price=1 returning id"))
        .rows,
    ).toHaveLength(0);
    expect(
      (await db.query("delete from public.product_images returning id")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select public.is_admin() allowed")).rows[0],
    ).toEqual({ allowed: false });
  });
  for (const sql of [
    "insert into private.admin_users(user_id) values(auth.uid())",
    "insert into public.products(slug,title,base_price) values('attack','Attack',1)",
    "select public.admin_save_product('{}'::jsonb)",
    "insert into public.admin_audit_log(entity_type,entity_id,action) values('a','b','c')",
  ]) {
    await expect(asUser(ordinary, () => db.exec(sql))).rejects.toThrow();
  }
  await db.query("delete from private.admin_users where user_id=$1", [admin]);
  await expect(
    asUser(admin, () => save({ id: crypto.randomUUID() })),
  ).rejects.toThrow(/Administrator/);
  await db.query("insert into private.admin_users values($1,now())", [admin]);
});
it("saves, publishes, archives and restores with stable child identities and stale edit detection", async () => {
  const source = adminProductSchema.parse(
    productInput(
      getDemoCatalogue().products.find((p) => p.slug === "velvet-knot")!,
    ),
  );
  await asUser(admin, async () => {
    const current = (
      await db.query<{ updated_at: Date }>(
        "select updated_at from public.products where id=$1",
        [source.id],
      )
    ).rows[0]!.updated_at.toISOString();
    let stamp = (await save(source, current)).updated_at;
    const read = (
      await db.query<{ document: typeof source }>(
        "select document from public.catalogue_products where id=$1",
        [source.id],
      )
    ).rows[0]!.document;
    expect(read.options.map((o) => o.id)).toEqual(
      source.options.map((o) => o.id),
    );
    expect(read.variants.map((v) => v.id)).toEqual(
      source.variants.map((v) => v.id),
    );
    for (const status of ["archived", "draft", "active"]) {
      stamp = (await save({ ...source, status }, stamp)).updated_at;
    }
    await expect(save(source, current)).rejects.toThrow(/changed/);
  });
});
it("creates new drafts and records append-only audit history", async () => {
  const p = adminProductSchema.parse({
    ...newProduct(),
    title: "Draft",
    slug: "new-draft",
  });
  await asUser(admin, async () => {
    await save(p);
    expect(
      (
        await db.query(
          "select * from public.admin_audit_log where entity_id=$1",
          [p.id],
        )
      ).rows,
    ).toHaveLength(1);
    await expect(db.exec("delete from public.admin_audit_log")).rejects.toThrow(
      /permission/,
    );
  });
});
it("rolls back all parent changes when a nested relation fails", async () => {
  const p = adminProductSchema.parse({
    ...newProduct(),
    title: "Rollback",
    slug: "rollback",
    collections: ["does-not-exist"],
  });
  await expect(asUser(admin, () => save(p))).rejects.toThrow(
    /Unknown collection/,
  );
  expect(
    (await db.query("select * from public.products where id=$1", [p.id])).rows,
  ).toHaveLength(0);
});
it("rejects inactive values and duplicate combinations inside SQL", async () => {
  const p = adminProductSchema.parse(
    productInput(
      getDemoCatalogue().products.find((p) => p.slug === "velvet-knot")!,
    ),
  );
  p.options[0]!.values[0]!.active = false;
  const stamp = (
    await db.query<{ updated_at: Date }>(
      "select updated_at from products where id=$1",
      [p.id],
    )
  ).rows[0]!.updated_at.toISOString();
  await expect(asUser(admin, () => save(p, stamp))).rejects.toThrow(/inactive/);
});
it("merges tags atomically and blocks deletion while used", async () => {
  const { rows } = await db.query<{ id: string; updated_at: Date }>(
    "select id,updated_at from tags order by slug limit 2",
  );
  await expect(
    asUser(admin, () =>
      db.query("select admin_mutate_tag('delete',$1::jsonb,$2)", [
        JSON.stringify({ id: rows[0]!.id }),
        rows[0]!.updated_at.toISOString(),
      ]),
    ),
  ).rejects.toThrow(/in use/);
  await asUser(admin, async () => {
    await db.query("select admin_mutate_tag('merge',$1::jsonb,$2,$3)", [
      JSON.stringify({ id: rows[0]!.id }),
      rows[0]!.updated_at.toISOString(),
      rows[1]!.id,
    ]);
    expect(
      (await db.query("select * from tags where id=$1", [rows[0]!.id])).rows,
    ).toHaveLength(0);
  });
});
it("protects shared assets from deletion and rejects unprepared publication", async () => {
  const id = crypto.randomUUID();
  await asUser(admin, async () => {
    await db.query(
      "insert into media_assets(id,original_name,private_path,status) values($1,'image','private/image','ready')",
      [id],
    );
    const p = adminProductSchema.parse({
      ...newProduct(),
      title: "Image",
      slug: "image",
      sku: "IMAGE",
      status: "active",
      images: [
        {
          id: crypto.randomUUID(),
          path: "x",
          alt: "",
          width: 1,
          height: 1,
          is_primary: true,
          sort_order: 0,
          variant_id: null,
          asset_id: id,
        },
      ],
    });
    await expect(save(p)).rejects.toThrow(/not ready/);
  });
});
