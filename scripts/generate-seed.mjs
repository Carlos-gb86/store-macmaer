import { readFile, writeFile } from "node:fs/promises";
const fixture = JSON.parse(
  await readFile(
    new URL("../src/modules/catalog/fixtures/catalogue.json", import.meta.url),
    "utf8",
  ),
);
const sql = [
  "-- Generated from representative development fixtures. NOT approved production prices/content.",
  "-- Run npm run seed:generate after editing the fixture. Applied by local db reset only.",
];
const literal = (value) =>
  value === null
    ? "null"
    : typeof value === "boolean" || typeof value === "number"
      ? String(value)
      : "'" +
        (typeof value === "object" ? JSON.stringify(value) : value).replaceAll(
          "'",
          "''",
        ) +
        "'";
function insert(table, row) {
  sql.push(
    "insert into public." +
      table +
      " (" +
      Object.keys(row).join(", ") +
      ") values (" +
      Object.values(row).map(literal).join(", ") +
      ") on conflict do nothing;",
  );
}
for (const collection of fixture.collections) insert("collections", collection);
const tags = [...new Set(fixture.products.flatMap((p) => p.tags))];
const tagIds = new Map(
  tags.map((tag, i) => [
    tag,
    "00000000-0000-4000-9000-" + String(i + 1).padStart(12, "0"),
  ]),
);
for (const tag of tags)
  insert("tags", {
    id: tagIds.get(tag),
    slug: tag,
    name: tag.replaceAll("-", " "),
  });
for (const product of fixture.products) {
  const { images, options, variants, collections, tags, ...row } = product;
  insert("products", row);
  for (const slug of collections)
    insert("product_collections", {
      product_id: product.id,
      collection_id: fixture.collections.find((c) => c.slug === slug).id,
    });
  for (const tag of tags)
    insert("product_tags", { product_id: product.id, tag_id: tagIds.get(tag) });
  for (const option of options) {
    const { values, ...row } = option;
    insert("product_options", { ...row, product_id: product.id });
    for (const value of values)
      insert("product_option_values", {
        ...value,
        option_id: option.id,
        product_id: product.id,
      });
  }
  for (const variant of variants) {
    const { value_ids, ...row } = variant;
    insert("product_variants", { ...row, product_id: product.id });
    for (const id of value_ids)
      insert("variant_option_values", {
        variant_id: variant.id,
        product_id: product.id,
        option_id: options.find((o) => o.values.some((v) => v.id === id)).id,
        value_id: id,
      });
  }
  for (const image of images)
    insert("product_images", { ...image, product_id: product.id });
}
await writeFile(
  new URL("../supabase/seed.sql", import.meta.url),
  sql.join("\n") + "\n",
);
