# Redundant WooCommerce variant cleanup

`scripts/cleanup-redundant-variants.ts` scans all catalogue products. It only
removes a sole imported `Variation N` that has no variant axis, no option-value
combination, and no references from carts, order items or inventory reservations.
Its effective price, compare-at price, weight, inventory and original SKU must
match its parent. Conflicting nonempty legacy dimensions and unknown commerce/plugin
metadata are retained for review. Real size/colour variants remain unchanged.
An otherwise redundant variation with measurements missing on the parent, or the
bookkeeping-only `_wc_pinterest_condition` field, can still be removed safely:
its entire original record is archived in the parent's `legacy_metadata` under
`redundant_woocommerce_variants`. Current product dimensions are not overwritten.

With Node 22.12+ and installed dependencies, preview using `.env.local`:

```sh
node --experimental-strip-types scripts/cleanup-redundant-variants.ts
```

The environment needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
Use `--env-file` for another local file. Applying also requires an authenticated
Supabase CLI with access to the explicit hosted project:

```sh
node --experimental-strip-types scripts/cleanup-redundant-variants.ts --apply --project-ref YOUR_SUPABASE_PROJECT_REF
```

Before application, owner-only, git-ignored backup and SQL files are written under
`migration/variant-cleanup-*`. The SQL transaction checks the exact product,
variant and affected gallery records again; briefly locks their tables and the
reference tables; detaches image-to-variant links; archives the removed variant
records in parent metadata; and deletes only the selected
redundant variant IDs. No product/image/option or transactional records are
deleted. Storage files, image order, featured-image status and bilingual alt text
are preserved. Existing writes cause a harmless NOWAIT abort; retry later.

After commit, the script verifies that all products, options, option values, real
variants and gallery records are unchanged except for the intended removal,
metadata archive / parent update timestamp, and image-link detachment. Reruns are safe. If verification fails after commit, do not
blindly restore the backup: inspect the report and any subsequent admin edits.
Restoration would require reinserting the selected variant records and restoring
their former image associations from the backup.

This is a catalogue-data cleanup, not a schema migration. WooCommerce is never
modified. Reapplying the old WooCommerce import may recreate source variations;
run this preview again afterwards if you intentionally reimport the catalogue.
