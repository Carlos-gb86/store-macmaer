#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import type { Database } from "../src/lib/supabase/database.types";

const inventory = z.enum([
  "MADE_TO_ORDER",
  "UNLIMITED",
  "TRACKED",
  "UNAVAILABLE",
]);
const money = z.number().int().nonnegative();
const productSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    sku: z.string().nullable(),
    legacy_woocommerce_id: z.number().nullable(),
    base_price: money,
    compare_at_price: money.nullable(),
    weight_grams: money.nullable(),
    inventory_strategy: inventory,
    stock_quantity: money.nullable(),
    legacy_metadata: z.record(z.string(), z.unknown()),
  })
  .catchall(z.unknown());
const variantSchema = z
  .object({
    id: z.uuid(),
    product_id: z.uuid(),
    title: z.string(),
    sku: z.string(),
    legacy_woocommerce_id: z.number().nullable(),
    price_override: money.nullable(),
    price_delta: z.number().int().nullable(),
    compare_at_price: money.nullable(),
    weight_override_grams: money.nullable(),
    inventory_strategy: inventory,
    stock_quantity: money.nullable(),
    active: z.boolean(),
    legacy_metadata: z.record(z.string(), z.unknown()),
  })
  .catchall(z.unknown());
const optionSchema = z
  .object({ id: z.uuid(), product_id: z.uuid(), is_variant_axis: z.boolean() })
  .catchall(z.unknown());
const imageSchema = z
  .object({
    id: z.uuid(),
    product_id: z.uuid(),
    variant_id: z.uuid().nullable(),
  })
  .catchall(z.unknown());
const joinSchema = z
  .object({
    variant_id: z.uuid(),
    product_id: z.uuid(),
    option_id: z.uuid(),
    value_id: z.uuid(),
  })
  .catchall(z.unknown());
const valueSchema = z.object({ id: z.uuid() }).catchall(z.unknown());
const referenceSchema = z.object({ variant_id: z.uuid() });
export const cleanupSnapshotSchema = z.object({
  products: z.array(productSchema),
  product_options: z.array(optionSchema),
  product_option_values: z.array(valueSchema),
  product_variants: z.array(variantSchema),
  variant_option_values: z.array(joinSchema),
  product_images: z.array(imageSchema),
  cart_items: z.array(referenceSchema),
  order_items: z.array(referenceSchema),
  inventory_reservations: z.array(referenceSchema),
});
export type CleanupSnapshot = z.infer<typeof cleanupSnapshotSchema>;
type Candidate = {
  product: z.infer<typeof productSchema>;
  variant: z.infer<typeof variantSchema>;
};

export function planVariantCleanup(snapshot: CleanupSnapshot) {
  const referenced = new Set(
    [
      ...snapshot.cart_items,
      ...snapshot.order_items,
      ...snapshot.inventory_reservations,
    ].map((row) => row.variant_id),
  );
  const candidates: Candidate[] = [];
  const retained: { id: string; product: string; reason: string }[] = [];
  for (const variant of snapshot.product_variants) {
    const product = snapshot.products.find(
      (row) => row.id === variant.product_id,
    );
    let reason: string | undefined;
    if (!product) reason = "Missing parent product";
    else if (
      snapshot.product_options.some(
        (row) => row.product_id === product.id && row.is_variant_axis,
      )
    )
      reason = "Product has genuine variant axes";
    else if (
      snapshot.variant_option_values.some(
        (row) => row.variant_id === variant.id,
      )
    )
      reason = "Variant has an option combination";
    else if (referenced.has(variant.id))
      reason = "Referenced by cart, order or inventory reservation";
    else if (
      snapshot.product_variants.filter((row) => row.product_id === product.id)
        .length !== 1
    )
      reason = "Multiple variants require owner review";
    else if (
      product.legacy_woocommerce_id === null ||
      variant.legacy_woocommerce_id === null ||
      variant.title !== `Variation ${variant.legacy_woocommerce_id}`
    )
      reason = "Not an empty imported WooCommerce variation";
    else if (
      !variant.active ||
      variant.inventory_strategy !== product.inventory_strategy ||
      variant.stock_quantity !== product.stock_quantity
    )
      reason = "Distinct availability or inventory";
    else if (
      (variant.price_override ??
        product.base_price + (variant.price_delta ?? 0)) !==
        product.base_price ||
      (variant.compare_at_price ?? product.compare_at_price) !==
        product.compare_at_price
    )
      reason = "Distinct price or sale price";
    else if (
      (variant.weight_override_grams ?? product.weight_grams) !==
      product.weight_grams
    )
      reason = "Distinct shipping weight";
    else if (hasDistinctDimensions(product, variant))
      reason = "Distinct legacy dimensions";
    else if (variant.legacy_metadata.source_sku !== product.sku)
      reason = "Distinct or unknown source SKU";
    else if (
      !Array.isArray(variant.legacy_metadata.unmapped_meta_keys) ||
      variant.legacy_metadata.unmapped_meta_keys.some(
        (key) => key !== "_wc_pinterest_condition",
      )
    )
      reason = "Unmapped plugin metadata requires review";
    else if (
      product.legacy_metadata.redundant_woocommerce_variants !== undefined &&
      !Array.isArray(product.legacy_metadata.redundant_woocommerce_variants)
    )
      reason = "Existing legacy archive requires review";
    if (reason || !product)
      retained.push({
        id: variant.id,
        product: product?.title ?? variant.product_id,
        reason: reason ?? "Missing parent product",
      });
    else candidates.push({ product, variant });
  }
  const ids = new Set(candidates.map(({ variant }) => variant.id));
  const images = snapshot.product_images.filter(
    (row) => row.variant_id && ids.has(row.variant_id),
  );
  return { candidates, images, retained };
}

function hasDistinctDimensions(
  product: Candidate["product"],
  variant: Candidate["variant"],
) {
  const dimensions = z
    .record(z.string(), z.unknown())
    .safeParse(variant.legacy_metadata.raw_dimensions);
  if (
    !dimensions.success ||
    !Object.values(dimensions.data).some((value) => Number(value) > 0)
  )
    return false;
  const parent = z
    .record(z.string(), z.unknown())
    .safeParse(product.legacy_metadata.raw_dimensions);
  // A sole variation's measurements with no parent measurements are archived,
  // not promoted into current dimensions or silently lost.
  if (
    !parent.success ||
    !Object.values(parent.data).some((value) => Number(value) > 0)
  )
    return false;
  return (
    !isDeepStrictEqual(dimensions.data, parent.data) ||
    variant.legacy_metadata.dimension_unit !==
      product.legacy_metadata.dimension_unit
  );
}

export function archiveVariant(
  product: Candidate["product"],
  variant: Candidate["variant"],
) {
  const existing = product.legacy_metadata.redundant_woocommerce_variants;
  if (existing !== undefined && !Array.isArray(existing))
    throw new Error("Unexpected existing legacy archive.");
  return {
    ...product.legacy_metadata,
    redundant_woocommerce_variants: [...(existing ?? []), variant],
  };
}

const literal = (value: unknown) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
export function buildCleanupSql(plan: ReturnType<typeof planVariantCleanup>) {
  if (!plan.candidates.length)
    throw new Error("No redundant variants to remove.");
  const expected = plan.candidates
    .map(
      ({ product, variant }) =>
        `('${variant.id}', '${product.id}', ${literal(product)}, ${literal(variant)}, ${literal(archiveVariant(product, variant))})`,
    )
    .join(",\n");
  const images = plan.images
    .map((image) => `('${image.id}', ${literal(image)})`)
    .join(",\n");
  return `begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
-- Brief write locks keep reference checks and gallery detachment atomic.
-- NOWAIT aborts harmlessly if another writer is already using these tables.
lock table public.products, public.product_options, public.product_variants,
  public.variant_option_values, public.product_images, public.cart_items,
  public.order_items, public.inventory_reservations in share row exclusive mode nowait;
create temporary table cleanup_expected(id uuid primary key, product_id uuid, product jsonb, variant jsonb, archived_metadata jsonb) on commit drop;
insert into cleanup_expected values ${expected};
create temporary table cleanup_images(id uuid primary key, image jsonb) on commit drop;
${images ? `insert into cleanup_images values ${images};` : ""}
do $cleanup$
declare expected record;
begin
  for expected in select * from cleanup_expected loop
    if not exists (select 1 from public.products p where p.id = expected.product_id and p is not distinct from jsonb_populate_record(null::public.products, expected.product))
      or not exists (select 1 from public.product_variants v where v.id = expected.id and v is not distinct from jsonb_populate_record(null::public.product_variants, expected.variant))
      or exists (select 1 from public.product_options o where o.product_id = expected.product_id and o.is_variant_axis)
      or exists (select 1 from public.variant_option_values j where j.variant_id = expected.id)
      or (select count(*) from public.product_variants v where v.product_id = expected.product_id) <> 1
      or exists (select 1 from public.cart_items c where c.variant_id = expected.id)
      or exists (select 1 from public.order_items o where o.variant_id = expected.id)
      or exists (select 1 from public.inventory_reservations r where r.variant_id = expected.id)
    then raise exception 'Variant or product changed / referenced: %', expected.id; end if;
  end loop;
  if exists (select 1 from cleanup_images e where not exists (
    select 1 from public.product_images i where i.id = e.id and i is not distinct from jsonb_populate_record(null::public.product_images, e.image)))
    or exists (select 1 from public.product_images i join cleanup_expected e on e.id = i.variant_id
      where not exists (select 1 from cleanup_images original where original.id = i.id))
  then raise exception 'Gallery changed since backup'; end if;
end $cleanup$;
update public.product_images set variant_id = null where id in (select id from cleanup_images);
update public.products p set legacy_metadata = e.archived_metadata from cleanup_expected e where p.id = e.product_id;
delete from public.product_variants where id in (select id from cleanup_expected);
select (select count(*) from cleanup_expected) as removed_variants, (select count(*) from cleanup_images) as detached_images;
commit;
`;
}

async function readSnapshot(client: ReturnType<typeof createClient<Database>>) {
  const snapshot: Record<string, unknown[]> = {};
  const tables = [
    "products",
    "product_options",
    "product_option_values",
    "product_variants",
    "variant_option_values",
    "product_images",
    "cart_items",
    "order_items",
    "inventory_reservations",
  ] as const;
  for (const table of tables) {
    const references =
      table === "cart_items" ||
      table === "order_items" ||
      table === "inventory_reservations";
    const rows: unknown[] = [];
    for (let from = 0; ; from += 100) {
      let query = client.from(table).select(references ? "variant_id" : "*");
      query = references
        ? query.not("variant_id", "is", null).order("variant_id")
        : query.order(table === "variant_option_values" ? "variant_id" : "id");
      const { data, error } = await query.range(from, from + 99);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...data);
      if (data.length < 100) break;
    }
    snapshot[table] = rows;
  }
  return cleanupSnapshotSchema.parse(snapshot);
}

export function verifyCleanup(
  before: CleanupSnapshot,
  after: CleanupSnapshot,
  plan: ReturnType<typeof planVariantCleanup>,
) {
  const removed = new Set(plan.candidates.map(({ variant }) => variant.id));
  const expected = {
    products: before.products.map((product) => {
      const candidate = plan.candidates.find(
        (row) => row.product.id === product.id,
      );
      return candidate
        ? {
            ...product,
            legacy_metadata: archiveVariant(product, candidate.variant),
            ...("updated_at" in product
              ? {
                  updated_at: after.products.find(
                    (row) => row.id === product.id,
                  )?.updated_at,
                }
              : {}),
          }
        : product;
    }),
    product_options: before.product_options,
    product_option_values: before.product_option_values,
    variant_option_values: before.variant_option_values,
    product_variants: before.product_variants.filter(
      (row) => !removed.has(row.id),
    ),
    product_images: before.product_images.map((row) =>
      row.variant_id && removed.has(row.variant_id)
        ? { ...row, variant_id: null }
        : row,
    ),
  };
  for (const table of Object.keys(expected) as (keyof typeof expected)[]) {
    const sorted = (
      rows: { id?: string; variant_id?: string | null; option_id?: string }[],
    ) =>
      [...rows].sort((a, b) =>
        (a.id ?? `${a.variant_id ?? ""}/${a.option_id ?? ""}`).localeCompare(
          b.id ?? `${b.variant_id ?? ""}/${b.option_id ?? ""}`,
        ),
      );
    if (!isDeepStrictEqual(sorted(expected[table]), sorted(after[table])))
      throw new Error(
        `Verification failed for ${table}. Review backup and subsequent admin changes.`,
      );
  }
}

async function save(path: string, value: unknown) {
  await mkdir("migration", { recursive: true });
  await writeFile(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
}

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean" },
      "project-ref": { type: "string" },
      "env-file": { type: "string", default: ".env.local" },
    },
  });
  process.loadEnvFile(values["env-file"]);
  const url = z.url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = new URL(url).hostname.replace(/\.supabase\.co$/u, "");
  if (
    values.apply &&
    (!/^[a-z]{20}$/u.test(projectRef) || values["project-ref"] !== projectRef)
  )
    throw new Error(
      "Apply requires --project-ref matching the hosted Supabase environment.",
    );
  const client = createClient<Database>(
    url,
    z.string().min(1).parse(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false } },
  );
  const snapshot = await readSnapshot(client);
  const plan = planVariantCleanup(snapshot);
  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const summary = {
    projectRef,
    productsScanned: snapshot.products.length,
    variantsScanned: snapshot.product_variants.length,
    removableVariants: plan.candidates.length,
    affectedProducts: plan.candidates.length,
    imagesToDetach: plan.images.length,
    retainedVariants: plan.retained.length,
    retained: plan.retained,
    removed: plan.candidates.map(({ product, variant }) => ({
      product: product.title,
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
    })),
  };
  if (!values.apply || !plan.candidates.length) {
    await save(`migration/variant-cleanup-dry-run-${timestamp}.json`, {
      ...summary,
      snapshot,
    });
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  const backup = `migration/variant-cleanup-backup-${timestamp}.json`;
  const sql = `migration/variant-cleanup-apply-${timestamp}.sql`;
  await save(backup, { projectRef, snapshot, plan });
  await save(sql, buildCleanupSql(plan));
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      resolveCli(),
      [
        "db",
        "query",
        "--linked",
        "--project-ref",
        projectRef,
        "--file",
        sql,
        "--output",
        "json",
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `Transactional SQL cleanup exited with ${code}. Check the database before rerunning; backup: ${backup}`,
            ),
          ),
    );
  });
  const after = await readSnapshot(client);
  verifyCleanup(snapshot, after, plan);
  const report = `migration/variant-cleanup-applied-${timestamp}.json`;
  await save(report, {
    ...summary,
    backup,
    verified: true,
    remainingRemovable: planVariantCleanup(after).candidates.length,
  });
  console.log(
    JSON.stringify(
      {
        removedVariants: plan.candidates.length,
        preservedImages: after.product_images.length,
        retainedVariants: after.product_variants.length,
        verified: true,
        backup,
        report,
      },
      null,
      2,
    ),
  );
}

const resolveCli = () => resolve("node_modules/.bin/supabase");
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Cleanup failed.");
    process.exitCode = 1;
  });
