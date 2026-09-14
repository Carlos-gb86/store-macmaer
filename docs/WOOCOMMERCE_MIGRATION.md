# WooCommerce catalogue migration

This is a one-time, rerunnable import from the existing WooCommerce shop into the Macmaer catalogue. The source client is structurally read-only: it only sends `GET` requests to WooCommerce v3 and the public WordPress Media API. It never requests customers or orders.

## 1. Create a read-only WooCommerce key

While signed in to the existing WordPress administration area, follow WooCommerce's [REST API key instructions](https://woocommerce.com/document/woocommerce-rest-api/) (the pipeline uses [HTTPS Basic authentication](https://developer.woocommerce.com/docs/apis/rest-api/authentication)):

1. Open **WooCommerce → Settings → Advanced → REST API**.
2. Select **Add key** (or **Create an API key**).
3. Use a clear description such as `Macmaer catalogue migration` and select an administrator account that will remain available for the migration window.
4. Set **Permissions** to **Read**. Do not select Read/Write.
5. Select **Generate API key** and copy both the consumer key and consumer secret immediately. WooCommerce only displays the secret once.

Keep the old shop on HTTPS. Revoke this key in the same screen after the final successful import and verification.

## 2. Configure the local environment

Use Node 22.12 or newer, as required by `package.json`. Add these values to the ignored `.env.development.local` file:

```dotenv
WOOCOMMERCE_URL=https://macmaer.com
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...

# Required only by --apply; use the intended Macmaer Supabase target.
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

The Supabase variable name accepts the newer secret API key; it does not require a legacy JWT service-role key. Do not add WooCommerce credentials to Vercel because this script is run locally only.

The target database must first have migration `202609140017_woocommerce_import.sql` applied. Both `catalogue` and `catalogue-drafts` Storage buckets must exist.

## 3. Run the mandatory dry run

Dry-run is the default and does not connect to Supabase:

```sh
npm run migration:woocommerce
```

An explicit equivalent and a fixed report path are:

```sh
npm run migration:woocommerce -- --dry-run --report migration/woocommerce-report.json
```

The dry run still reads every published product, variation and approved review, retrieves WordPress media alt text, and downloads/decodes every image. This makes the image checks meaningful. It does not upload or write anything.

Successfully downloaded source bytes are cached in the ignored local directory `migration/.woocommerce-image-cache/`, keyed by source identity and source URL. This makes a later retry or `--apply` resilient to temporary WordPress/Bluehost failures while using the exact bytes validated by the dry run. Delete that directory if you intentionally need to fetch changed source images again. The cache contains image bytes only; source URLs are never written to Supabase.

Review the JSON report before applying. In particular, resolve every item under `errors`, inspect `skippedRecords`, and decide how to handle every `unmappedFields` entry. Value summaries are deliberately abbreviated and redact recognizable URLs and email addresses.

## 4. Apply the import

Once the report is acceptable and the target has been confirmed:

```sh
npm run migration:woocommerce -- --apply
```

Apply mode:

- imports all source products returned with `status=publish` as **drafts**, so they cannot accidentally appear in the storefront;
- creates or adopts matching categories and tags by WooCommerce ID/slug;
- represents variation attributes as variant axes and WooCommerce variations as SKU variants;
- preserves each source SKU in legacy metadata and deterministically suffixes a variation SKU with its WooCommerce variation ID when WooCommerce repeats the parent SKU, satisfying Macmaer's unique-SKU constraint without losing the original value;
- represents attributes that have no exact per-variation value as separate configurable options rather than false SKU axes;
- represents supported WooCommerce Product Add-Ons as separate configurable options;
- writes all product/variation legacy IDs and preserves source details in `legacy_metadata`;
- optimizes every source JPEG/PNG/WebP/AVIF to WebP, content-deduplicates it, uploads one deterministic object per unique content hash to each Macmaer catalogue bucket, and stores only the new Storage object path;
- preserves gallery ordering, primary-image state, variation association and WordPress media alt text;
- imports only approved reviews, without reviewer email or an email hash; and
- writes a permission-`0600` JSON report under `migration/` unless another path is supplied.

The import does not publish products. Review imported drafts in `/admin/products`, especially pricing, tax/shipping classes, add-ons listed as unmapped, descriptions, images and variations. Publish only after this review.

The existing shop uses WCPA for three known five-pack scrunchie products. They are explicitly mapped by legacy WooCommerce ID: velvet `3545`, cotton velour `3557`, and boucle `3561`. Each gets one native repeated-colour option that renders five independent required selectors, permits repeated colours, preserves selection order, has no price effect, and creates no variant combinations or stock rows. Other non-empty WCPA references remain unmapped and are reported because their form definitions require a WordPress administrator/nonce endpoint.

The report's `imageAudit` distinguishes gallery, featured, variation-only, additional shared-image variant bindings, repeated-source, and repeated-content relationships. A placement means one intended `product_images` relationship; it is not a download or physical Storage object. The first gallery image is featured within its existing placement and is never counted twice. When several SKU variants share one gallery image, the target needs a separate relationship for each additional variant but continues to use one physical Storage object. `unmappedSummary` groups non-empty unmapped metadata by key, frequency and likely significance.

## Safe reruns and recovery

Destination UUIDs are deterministic. The database also records unique WooCommerce product, variation, category, tag, media and review references. Rerunning updates the matching product and atomically replaces its imported images/options/variants/taxonomy links instead of adding duplicates. Review upserts preserve an existing target record. Storage uploads use stable object paths.

The source is authoritative for the imported child graph. Therefore, do not make final manual edits to an imported draft and then rerun it without expecting source-managed options, variants, images and taxonomy links to be refreshed. The script never deletes source data and never modifies WooCommerce.

If any image for a product fails to download, validate or upload, that product is not written during that run and the report records the failure. Already uploaded deterministic image objects are safe to reuse on the next run. The process exits unsuccessfully when the report contains errors.

Historical customer and order data are explicitly outside this pipeline.
