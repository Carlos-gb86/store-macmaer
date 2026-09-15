# Swedish catalogue translation

The current catalogue has a reviewed English-to-Swedish dictionary in
`scripts/data/catalogue-sv.json`. The one-time script fills empty Swedish fields
without changing English content, product status, prices, SKUs, internal option
keys, slugs or media URLs. It does not touch customers, orders or WooCommerce.
No schema migration is required; it uses the existing bilingual catalogue fields.

## Running locally

Use Node 22.12+ with the project's dependencies installed. Keep
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
(a Supabase secret API key is supported). Never commit secrets.

Preview, without database writes:

```sh
node --experimental-strip-types scripts/translate-catalogue-sv.ts
```

Apply to the explicitly selected hosted project:

```sh
node --experimental-strip-types scripts/translate-catalogue-sv.ts --apply --project-ref YOUR_SUPABASE_PROJECT_REF
```

Use `--env-file .env.development.local` to select another environment file.
`--inspect` exports catalogue-only source text for extending the dictionary.
Unmapped text blocks application rather than producing partial translations.

Before writing, the script saves a catalogue snapshot and proposed patches under
`migration/swedish-catalogue-backup-*.json`. Dry-run, success and interruption
reports are stored in the same ignored directory, with owner-only permissions.
Preserve the backup until the translations have been reviewed. This is not an
automatic rollback tool: restoring a field must also preserve subsequent edits.

Only empty Swedish fields are filled. Concurrent source/target changes stop the
run; earlier completed records remain translated. Safe reruns preserve those
translations and any manual Swedish edits. All written values are read back and
verified. Rich-text formatting and links are preserved, including existing links
to the old site; this task does not rewrite those links.

## Owner review

The source inventory on 15 September 2026 contained 49 products, including 42
imported drafts and seven sample products. Drafts remain drafts. Translations are
best-effort copy, not independent verification of product claims.

Please review these inherited issues before publication:

- Some descriptions disagree with titles/material fields about velvet, bouclé,
  teddy fabric or cotton jersey. A wristlet description also contains hair-tie
  wording. These factual inconsistencies were not guessed away.
- Sample descriptions and processing-time placeholders still need real content.
- Stated colour counts, approximate measurements and inch conversions may need
  updating. The original quantities are retained.
- Certification, allergy and child/nursery safety claims require owner review.
- SEO template markers such as `%%title%%` and `#post_excerpt` remain where present
  in the source; these should be replaced with actual SEO copy.
- Filename-like image alt text gets a Swedish product-name fallback with an image
  number, not invented visual details. The initial plan identified 266 such
  images; the report lists them for richer, photo-specific accessibility text.

All translations remain editable in the admin panel. Existing storefront
localisation reads the Swedish fields; catalogue caches may take a few minutes
to refresh. There is no need to deploy the script to display database translations.
