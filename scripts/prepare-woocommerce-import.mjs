#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function arrayPayload(value, key) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value[key]))
    return value[key];
  throw new Error("Expected a JSON array or an object containing " + key + ".");
}

function text(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sql(value) {
  return "'" + String(value ?? "").replaceAll("'", "''") + "'";
}

export function prepareWooCommerce(products, reviews) {
  const catalogue = products.map((product) => ({
    sourceId: String(product.id),
    slug: slug(product.slug || product.name),
    title: text(product.name),
    shortDescription: text(product.short_description),
    description: text(product.description),
    sku: text(product.sku) || null,
    priceSek: product.regular_price || product.price || null,
    status: product.status === "publish" ? "draft-after-review" : "draft",
    categories: (product.categories ?? []).map((category) => ({
      sourceId: String(category.id ?? ""),
      slug: slug(category.slug || category.name),
      name: text(category.name),
    })),
    tags: (product.tags ?? []).map((tag) => slug(tag.slug || tag.name)),
    images: (product.images ?? []).map((image) => ({
      sourceId: String(image.id ?? ""),
      url: String(image.src ?? ""),
      alt: text(image.alt || product.name),
    })),
    attributes: product.attributes ?? [],
    variations: product.variations ?? [],
    needsManualOptionReview: true,
  }));
  const productById = new Map(
    catalogue.map((product) => [product.sourceId, product]),
  );
  const preparedReviews = reviews
    .map((review) => {
      const product = productById.get(String(review.product_id));
      if (!product) return null;
      return {
        sourceId: String(review.id),
        productSlug: product.slug,
        displayName: text(review.reviewer) || "Customer",
        rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),
        body: text(review.review),
        createdAt: review.date_created_gmt || review.date_created || null,
      };
    })
    .filter((review) => review && review.body.length >= 10);
  const redirects = catalogue.map((product) => ({
    source: "/product/" + product.slug,
    destination: "/products/" + product.slug,
  }));
  return { catalogue, reviews: preparedReviews, redirects };
}

function reviewSql(reviews) {
  const statements = reviews.map(
    (review) =>
      "insert into public.product_reviews(\n" +
      "  product_id,display_name,rating,body,status,source,source_reference,created_at\n" +
      ") select id," +
      sql(review.displayName) +
      "," +
      review.rating +
      "," +
      sql(review.body) +
      ",'PENDING','WOOCOMMERCE'," +
      sql(review.sourceId) +
      ",coalesce(" +
      (review.createdAt ? sql(review.createdAt) : "null") +
      "::timestamptz,now())\n" +
      "from public.products where slug=" +
      sql(review.productSlug) +
      "\non conflict(source,source_reference) do nothing;",
  );
  return [
    "-- Generated review import. Imported reviews remain PENDING until individually reviewed.",
    "begin;",
    ...statements,
    "commit;",
    "",
  ].join("\n\n");
}

async function main() {
  const productsPath = argument("--products");
  const reviewsPath = argument("--reviews");
  const outputPath = resolve(
    argument("--output") ?? "migration/woocommerce-prepared",
  );
  if (!productsPath || !reviewsPath)
    throw new Error(
      "Usage: npm run migration:prepare -- --products products.json --reviews reviews.json [--output directory]",
    );
  const products = arrayPayload(
    JSON.parse(await readFile(resolve(productsPath), "utf8")),
    "products",
  );
  const reviews = arrayPayload(
    JSON.parse(await readFile(resolve(reviewsPath), "utf8")),
    "reviews",
  );
  const prepared = prepareWooCommerce(products, reviews);
  await mkdir(outputPath, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(outputPath, "catalogue-review.json"),
      JSON.stringify(prepared.catalogue, null, 2) + "\n",
    ),
    writeFile(
      resolve(outputPath, "legacy-redirects.json"),
      JSON.stringify(prepared.redirects, null, 2) + "\n",
    ),
    writeFile(resolve(outputPath, "reviews.sql"), reviewSql(prepared.reviews)),
  ]);
  console.log(
    "Prepared " +
      prepared.catalogue.length +
      " products, " +
      prepared.reviews.length +
      " reviews, and " +
      prepared.redirects.length +
      " product redirects in " +
      outputPath +
      ".",
  );
  console.log(
    "No database was changed. Review product options, images, prices, redirects, and every imported review before applying anything.",
  );
}

if (import.meta.url === "file://" + process.argv[1])
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
