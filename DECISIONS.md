# Implementation decisions

## Scope: Phases 0–2

Implemented and verified foundations, public catalogue, and Phase 2 catalogue administration. Phase 1 includes homepage, collection pages, product pages, responsive navigation, local/Storage image support, search/filter/sort and generic configuration previews.

No cart, destination/currency selection, price calculation engine, tax/shipping/discount tables or services, checkout, Stripe, order/refund tables, reviews, email or migration tooling. The complete schema list in SPEC section 28 is phased, not a mandate to implement later commerce systems now. SEO is limited to basic page metadata and noindex for previews.

## Runtime and tooling

Next.js 16 App Router, React 19, strict TypeScript with unchecked-index protection, Tailwind 4 design tokens, npm lockfile and exact direct dependency versions. Server Components are the default; interactive galleries, configuration previews, and admin editors use client state.

Node 22.12+ is required by current Supabase/testing dependencies. ESLint 9.39.5 is pinned because the React, import and accessibility plugins shipped by eslint-config-next 16.3.4 do not yet support ESLint 10. Upgrading to 10 was checked and fails inside those plugins; revisit together with the Next lint preset. npm marks ESLint 9 deprecated. No runtime package advisory was reported during installation.

Production builds use the supported webpack option. Turbopack's build-time CSS worker could not bind its local port in this execution environment; webpack was verified successfully. Turbopack development and browser tests work.

## Data and authorization

Catalogue definitions are normalized: products, collections, tags, membership tables, local option definitions and values, variants, variant/value associations, and images. Repeated select groups reuse one value set with a repeat count and duplicate rule. They do not multiply variants.

Composite foreign keys prevent cross-product associations. Money is stored in bounded Postgres integer minor units with the product currency; option/variant deltas inherit that currency. No money conversion or total calculation is implemented. Catalogue sorting uses base price; heterogeneous currencies must not be activated until Phase 3 provides comparable display pricing.

A nullable `tax_category_key` reserves product classification without inventing tax categories or rates. Phase 4 should migrate this to the tax-category relation. Products default to drafts. Transactional foreign keys and archive/history protections will be added with orders; the current public roles cannot delete products.

RLS restricts reads to active parents/children. Writes are denied to anonymous and ordinary authenticated users; provisioned administrators have RLS-governed access. Service-role access is isolated behind `server-only` and is not used by storefront reads. The catalogue view uses `security_invoker`, so it cannot bypass table RLS.

Supabase SSR sessions are refreshed by src/proxy.ts. requireAdmin() verifies the Auth identity using getUser() and checks current UUID allow-list membership. Revocation is effective on the next protected request, including direct Server Action calls. Admin pages are dynamic/private and public reads remain stateless anonymous.

The public Storage bucket holds published catalogue assets only. Image metadata RLS does not make a public Storage URL private. Phase 2 adds a private catalogue-drafts bucket, validated uploads, registry references, signed previews, publication copies, and retryable cleanup.

## Preview data and design

The default without explicit configuration is Supabase mode and fails if configuration is incomplete. `.env.example` explicitly opts into demo mode. Database errors never silently switch to sample data.

The JSON fixture and generated SQL seed share one source. Six active examples and one draft cover a simple product, size variants, colour/size variants (including missing and out-of-stock combinations), customization, a five-selection pack and an unavailable product. Prices, stock, dimensions/weights and product copy are illustrative, not migrated or approved business data.

Reference images were copied from Macmaer's existing site for the rebuild; provenance is recorded in `public/images/catalogue/SOURCES.md`. Review exact product/image associations and production content before launch. The accessory sample deliberately uses a photography placeholder.

The provisional visual direction uses warm paper, olive, editorial serif headings and generous spacing. System fonts avoid build-time font-network dependencies. The homepage story copy is provisional; no testimonials or unverified delivery/tax claims have been invented.

No add-to-cart button or payment UI is presented. Generic options support previewing configuration and SKU matching. Base prices stay catalogue reference values; dynamic price estimates, currency/tax handling and authoritative commerce calculations belong to Phase 3 onward.

## Verification and growth

PGlite executes catalogue migrations and RLS tests against PostgreSQL without Docker. Supabase-owned role/bucket scaffolding is mocked; full Supabase Auth/Storage/API behavior must also be checked with Docker or a staging project. Docker-backed Auth/Storage integration tests now complement the embedded suite.

On 2026-09-05, the original two migrations were applied to the owner's staging project (`pvdxqtyklfdzukawbtps`). Phase 2 adds migrations rather than rewriting that deployed history. All four new Phase 2 migrations are now applied (six total). The confirmed owner account is provisioned in the UUID allow-list. Staging has six active representative samples and one private draft. Hosted signup is disabled, email confirmation remains enabled, and the staging-backed production build passed. CLI link metadata and credentials remain ignored by Git.

Generated database types describe current SQL tables/views/functions and are checked for drift in CI. Relationship metadata is not generated; repositories use a validated read view instead of SDK-inferred joins. Extend the generator when adding new SQL types, or adopt Supabase CLI generation in a full local stack.

The small catalogue is loaded anonymously in bounded API pages, cached for 60 seconds, and searched/sorted/paginated on the server. Scale to indexed SQL search and narrower per-route queries if the actual catalogue warrants it. Admin Server Actions use updateTag() to invalidate catalogue/content reads immediately.

## Owner decisions before later phases/production

Follow SPEC section 41: approved catalogue/prices, tax-inclusive base-price meaning, inventory/processing times, return classes, tax strategy/rates, supported destinations, shipping rates, FX provider, Stripe account/payment methods, policy copy and final brand assets.

These decisions do not block the preview. No VAT, exchange or shipping rates are seeded. Cart, checkout and transactional schema remain explicitly deferred.

## Phase 2 administration decisions

Admin identities use a private UUID allow-list, provisioned only by trusted CLI/database access. Hosted and local signup must be disabled. Email/password accounts and password management remain private through Supabase Dashboard. No public signup, account recovery, or role-assignment flow is introduced.

Product, collection, tag, and homepage actions validate typed inputs and call atomic invoker-security RPCs. Multi-table product edits retain child identities. Database timestamps use clock_timestamp() so successive writes within a transaction still advance the conflict token. Advisory locks serialize product saves, cross-table SKU ownership, and tag merges. Product deletion is not granted; archive/restore is the lifecycle.

Catalogue amounts use SEK and exact decimal-string-to-integer parsing. Option configuration and SKU matching remain separate from future purchasing/pricing services. Repeated selections never generate Cartesian-product variants. Numeric step validation is shared with storefront previews. Tax classification remains null until Phase 4.

New imagery is uploaded into private Storage through signed upload URLs and fully decoded with Sharp before acceptance. The 10 MiB limit is supplemented by a 40-megapixel decoded limit. JPEG, PNG, WebP, and AVIF are accepted; SVG, animation, format mismatches, and invalid payloads are rejected. Preview URLs expire after five minutes and bypass the public optimizer. Upload URLs expire after two hours.

Public copies are prepared before catalogue commits. Failed publication preserves prior references and attempts compensating deletion. Cleanup failures are recorded and retried from the media page. Leases protect in-progress saves; referenced originals cannot be deleted. Previously published assets remain public when archived. The current media picker is bounded to 500 recent assets; a searchable library can be added when catalogue size requires it.

Tiptap stores allow-listed structured JSON with plain-text projections. Public rendering uses React nodes, never arbitrary HTML. Homepage controls are fixed fields and ordered memberships, not a page builder. Inactive references are skipped. Audit logs are append-only to application roles; failure logs carry operation/error codes without credentials or customer/form data.

The explicit staging setup requires a staging target, matching CLI project reference, and matching environment URL. Deterministic fixture seeds preserve existing rows and never reset hosted data. Production catalogue approval and commercial configuration remain owner decisions for later phases.

## Phase 2 completion — 2026-09-05

Login configuration correction: hosted email/password login was disabled by `auth.email.enable_signup=false`. Keep that provider setting `true` while global `auth.enable_signup=false` blocks registration. Staging Auth settings and the password endpoint were rechecked after correction; integration tests now assert both settings together. Login failures log only error code/status/name on the server and distinguish credential rejection from service failures.

Lint, formatting, strict types, 38 unit/database/direct-action tests, 5 real Supabase Auth/Storage integration tests, 8 desktop/mobile storefront browser checks, and 10 admin browser checks passed. Browser acceptance covers the full draft lifecycle, all five representative models, media/homepage/collection publication, ordinary-user denial, stale-edit value preservation, and expired cookie session refresh. The production build passed with the connected staging catalogue, and production admin response headers were verified as private/no-store.

Real API testing identified two Supabase-specific requirements: intentional stale-edit conflicts use PT409 so PostgREST returns HTTP 409 without retrying serialization errors; homepage membership replacement uses explicit WHERE clauses to satisfy the hosted safe-delete setting. Both are covered by database/integration/browser tests.

Phase 3 (cart, destination, currency, and server-authoritative customer pricing) is the next separate milestone. No later-phase commerce services were introduced.
