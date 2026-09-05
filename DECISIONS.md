# Implementation decisions

## Scope: Phases 0–1

Implemented foundations and public catalogue only. Phase 1 includes homepage, collection pages, product pages, responsive navigation, local/Storage image support, search/filter/sort and generic configuration previews.

No admin login/actions, cart, destination/currency selection, price calculation engine, tax/shipping/discount tables or services, checkout, Stripe, order/refund tables, reviews, email or migration tooling. The complete schema list in SPEC section 28 is phased, not a mandate to implement later commerce systems now. SEO is limited to basic page metadata and noindex for previews.

## Runtime and tooling

Next.js 16 App Router, React 19, strict TypeScript with unchecked-index protection, Tailwind 4 design tokens, npm lockfile and exact direct dependency versions. Server Components are the default; only the image gallery and configuration preview need client state.

Node 22.12+ is required by current Supabase/testing dependencies. ESLint 9.39.5 is pinned because the React, import and accessibility plugins shipped by eslint-config-next 16.3.4 do not yet support ESLint 10. Upgrading to 10 was checked and fails inside those plugins; revisit together with the Next lint preset. npm marks ESLint 9 deprecated. No runtime package advisory was reported during installation.

Production builds use the supported webpack option. Turbopack's build-time CSS worker could not bind its local port in this execution environment; webpack was verified successfully. Turbopack development and browser tests work.

## Data and authorization

Catalogue definitions are normalized: products, collections, tags, membership tables, local option definitions and values, variants, variant/value associations, and images. Repeated select groups reuse one value set with a repeat count and duplicate rule. They do not multiply variants.

Composite foreign keys prevent cross-product associations. Money is stored in bounded Postgres integer minor units with the product currency; option/variant deltas inherit that currency. No money conversion or total calculation is implemented. Catalogue sorting uses base price; heterogeneous currencies must not be activated until Phase 3 provides comparable display pricing.

A nullable `tax_category_key` reserves product classification without inventing tax categories or rates. Phase 4 should migrate this to the tax-category relation. Products default to drafts. Transactional foreign keys and archive/history protections will be added with orders; the current public roles cannot delete products.

RLS restricts reads to active parents/children. Writes are denied to anonymous and authenticated users. Service-role access is isolated behind `server-only` and is not used by storefront reads. The catalogue view uses `security_invoker`, so it cannot bypass table RLS.

Browser and cookie-aware server clients are foundations only. Before Phase 2 introduces protected pages, implement the Supabase session-refresh proxy and server-side admin authorization; never use cookie session contents alone as authorization.

The public Storage bucket holds published catalogue assets only. Image metadata RLS does not make a public Storage URL private. Upload mutation policies and media management are deferred.

## Preview data and design

The default without explicit configuration is Supabase mode and fails if configuration is incomplete. `.env.example` explicitly opts into demo mode. Database errors never silently switch to sample data.

The JSON fixture and generated SQL seed share one source. Six active examples and one draft cover a simple product, size variants, colour/size variants (including missing and out-of-stock combinations), customization, a five-selection pack and an unavailable product. Prices, stock, dimensions/weights and product copy are illustrative, not migrated or approved business data.

Reference images were copied from Macmaer's existing site for the rebuild; provenance is recorded in `public/images/catalogue/SOURCES.md`. Review exact product/image associations and production content before launch. The accessory sample deliberately uses a photography placeholder.

The provisional visual direction uses warm paper, olive, editorial serif headings and generous spacing. System fonts avoid build-time font-network dependencies. The homepage story copy is provisional; no testimonials or unverified delivery/tax claims have been invented.

No add-to-cart button or payment UI is presented. Generic options support previewing configuration and SKU matching. Base prices stay catalogue reference values; dynamic price estimates, currency/tax handling and authoritative commerce calculations belong to Phase 3 onward.

## Verification and growth

PGlite executes catalogue migrations and RLS tests against PostgreSQL without Docker. Supabase-owned role/bucket scaffolding is mocked; full Supabase Auth/Storage/API behavior must also be checked with Docker or a staging project. Docker was not running during this implementation.

On 2026-09-05, the existing Phase 1 migrations were applied to the owner's new hosted `store-macmaer` Supabase project using the authenticated CLI. Verified all ten catalogue tables have RLS enabled, anonymous/authenticated roles have no write grants, the read view preserves caller RLS, and the public image bucket has the configured MIME/size restrictions. Public catalogue API reads and a production build in Supabase mode passed. No sample data was inserted; the catalogue is empty. The local `.env.local` now selects Supabase mode, and CLI link metadata remains ignored by Git. Auth flows and actual image uploads remain unimplemented and untested as later-phase work.

Generated database types describe current SQL tables/views and are checked for drift in CI. Relationship metadata is not generated; repositories use a validated read view instead of SDK-inferred joins. Extend the generator when adding new SQL types, or adopt Supabase CLI generation in a full local stack.

The small catalogue is loaded anonymously in bounded API pages, cached for 60 seconds, and searched/sorted/paginated on the server. Scale to indexed SQL search and narrower per-route queries if the actual catalogue warrants it. Future admin writes should revalidate the catalogue cache tag.

## Owner decisions before later phases/production

Follow SPEC section 41: approved catalogue/prices, tax-inclusive base-price meaning, inventory/processing times, return classes, tax strategy/rates, supported destinations, shipping rates, FX provider, Stripe account/payment methods, policy copy and final brand assets.

These decisions do not block the preview. No VAT, exchange or shipping rates are seeded. Admin, cart, checkout and transactional schema remain explicitly deferred.
