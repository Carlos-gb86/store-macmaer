# Macmaer Next.js E-commerce Platform — Product & Technical Specification

**Version:** 0.1  
**Status:** Initial implementation specification  
**Primary audience:** Codex / software implementation agent  
**Store type:** Direct-to-consumer Scandinavian home decor / knot pillows and accessories  
**Primary market:** Worldwide, shipping from Sweden  

---

## 1. Project overview

Rebuild the existing Macmaer website (`https://macmaer.com`) as a modern, fast, maintainable e-commerce application using Next.js rather than WordPress, Elementor and WooCommerce.

The new application should preserve the strongest parts of the existing Macmaer identity—handmade Scandinavian decor, strong product photography, material/collection-based browsing, customer reviews and a clean visual style—while substantially improving:

- performance and responsiveness;
- mobile experience;
- maintainability;
- product management;
- product configuration flexibility;
- international pricing/tax/shipping handling;
- checkout reliability;
- order management;
- SEO and accessibility;
- developer experience.

The application is not intended to become a generic Shopify/WooCommerce competitor. It should implement the commerce functionality **Macmaer actually needs**, with a clean architecture that allows reasonable expansion later.

The current site should be used as a **design and content reference, not as a pixel-perfect implementation target**.

---

## 2. High-level goals

### 2.1 Customer-facing goals

Customers should be able to:

1. discover Macmaer and understand the brand;
2. browse collections and the complete catalogue;
3. search, filter and sort products;
4. view rich product pages and image galleries;
5. configure products with product-specific choices such as size, colour, material or accessory options;
6. add configured products to a cart;
7. choose their preferred display/payment currency from:
   - SEK
   - EUR
   - USD
8. receive correct pricing based on their shipping destination;
9. see VAT/tax treatment appropriate to the shipping destination and configured store tax strategy;
10. receive a shipping quote based on shipping country and relevant package/order properties;
11. complete a secure checkout;
12. pay using Stripe-supported payment methods;
13. receive transactional emails;
14. receive shipping/tracking information;
15. submit product reviews where enabled;
16. use the site smoothly on mobile, tablet and desktop.

### 2.2 Shop-owner goals

An authenticated shop administrator should be able to manage the shop without editing code, including:

- products;
- product images;
- product variants;
- configurable product options;
- inventory / made-to-order behaviour;
- prices;
- collections;
- tags;
- featured products;
- discounts;
- orders;
- refunds;
- fulfilment/tracking;
- tax configuration;
- shipping zones/rates;
- supported countries;
- currencies and pricing behaviour;
- customer reviews;
- core marketing/homepage content;
- FAQ/static content where practical;
- basic store settings.

### 2.3 Engineering goals

The system should:

- be strongly typed;
- avoid trusting client-side monetary calculations;
- preserve immutable financial/order history;
- handle payment webhooks idempotently;
- keep payment-card data outside our infrastructure;
- be easy to deploy and operate;
- minimize third-party dependencies;
- include meaningful automated tests around commerce-critical logic;
- make future migration/integration possible without major rewrites.

---

## 3. Explicit non-goals for the first release

Unless required during implementation, do **not** build the following in v1:

- a generic multi-vendor marketplace;
- multiple shop owners/tenants;
- warehouse management;
- real-time carrier label purchasing;
- a native mobile app;
- complex ERP/accounting integration;
- B2B wholesale pricing;
- subscription products;
- customer loyalty points;
- gift cards;
- AI product recommendations;
- automatic handling/collection of non-EU customs duties;
- custom payment processing or storage of card details.

The architecture should not unnecessarily prevent these features later.

---

## 4. Proposed technology stack

Use the following stack unless a strong implementation reason requires a change.

### Application

- **Next.js** using the App Router
- **TypeScript** with strict mode
- **React**
- **Tailwind CSS** for styling
- Server Components by default
- Client Components only where interaction requires them

### Backend / data

- **Supabase Postgres** — relational database
- **Supabase Auth** — administrator authentication
- **Supabase Storage** — product/content images
- **Row Level Security (RLS)** for protected tables where appropriate

### Payments

- **Stripe**
- Stripe PaymentIntents / Payment Element unless a later implementation decision favors Stripe Checkout
- Stripe webhooks for authoritative payment state
- Stripe refund API for full/partial refunds

Never store raw card data.

### Hosting

- **Vercel** for Next.js
- Supabase managed infrastructure for database/auth/storage

### Email

Use a transactional email provider such as **Resend** or equivalent.

Email provider logic should be abstracted behind a small application service so the provider can be replaced.

### Validation

- **Zod** or equivalent schema validation at server boundaries

### Testing

- unit tests for financial/business logic;
- integration tests for checkout/payment state;
- Playwright or equivalent for critical e2e flows.

---

## 5. Core architectural rules

These rules are mandatory.

### 5.1 Server-authoritative commerce calculations

The client may show estimates, but the server must independently calculate and validate:

- product prices;
- variant price adjustments;
- product-option price adjustments;
- discounts;
- exchange-rate conversion;
- tax/VAT;
- shipping;
- final total.

Never accept a final amount supplied by the browser.

### 5.2 Store money as integer minor units

Store monetary amounts as integer minor units wherever possible.

Examples:

- `65000` = 650.00 SEK if represented with two decimal minor units;
- currency must always accompany an amount.

Do not use binary floating-point arithmetic for money.

### 5.3 Snapshot order data

An order must remain historically accurate even if the product, tax rules, shipping rules or exchange rates later change.

Each order/order item must therefore snapshot relevant values such as:

- product title;
- SKU;
- selected options;
- product image reference;
- unit price;
- quantity;
- currency;
- exchange rate used;
- VAT/tax rate;
- VAT/tax amount;
- shipping amount;
- discount amount;
- shipping country;
- tax strategy/mode;
- final totals.

Do not reconstruct old orders from current product data.

### 5.4 Avoid hard deletion of transactional data

Products that have appeared in orders should normally be archived, not physically deleted.

Orders, payments, refunds and financial audit data must not be hard-deleted through the normal admin interface.

### 5.5 Payment state is webhook-authoritative

A redirect back to the application is **not** proof that an order has been paid.

Stripe webhook events must be used to finalize authoritative payment state.

Webhook handlers must:

- verify Stripe signatures;
- be idempotent;
- record processed event IDs;
- safely tolerate retries and events arriving out of order where possible.

### 5.6 Secrets stay server-side

Never expose:

- Supabase service-role keys;
- Stripe secret keys;
- webhook signing secrets;
- email-provider secrets;
- internal admin APIs.

---

## 6. Visual/design direction

Use the current Macmaer website as a reference for brand identity and information architecture, while modernising the design.

### Desired visual characteristics

- Scandinavian/minimalist;
- premium but warm rather than sterile;
- strong use of Macmaer's existing product photography;
- generous whitespace;
- elegant editorial typography;
- subtle interactions/animations;
- restrained colour palette;
- product imagery should dominate product browsing;
- strong mobile experience;
- consistent spacing and component system.

### Avoid

- generic SaaS/dashboard styling on the public storefront;
- excessive cards/borders;
- heavy animation libraries where CSS is sufficient;
- visual clutter;
- dependence on page-builder concepts inherited from Elementor.

### Responsive behaviour

Design mobile-first and explicitly support:

- small phones;
- modern phones;
- tablets;
- laptops;
- wide desktop displays.

---

## 7. Public storefront information architecture

Suggested routes are illustrative and may be refined.

### 7.1 Home / landing page — `/`

Should include configurable sections such as:

- announcement bar;
- header/navigation;
- hero section;
- primary CTA;
- featured collections;
- best sellers / featured products;
- brand/handmade story;
- editorial/lifestyle image section;
- value propositions such as handmade, secure payment, tracked delivery;
- testimonials/reviews;
- secondary collection promotion;
- footer with policies, contact and social links.

The administrator should be able to change at least:

- hero title/subtitle;
- hero image;
- hero CTA;
- featured collections;
- featured products;
- testimonial visibility/order;
- promotional/announcement text.

### 7.2 Collections — `/collections`

Display all active collections with strong imagery.

Examples inspired by the current shop include:

- Bouclé;
- Velvet;
- Cotton Velour;
- Limited Edition;
- future seasonal or editorial collections.

A product may belong to multiple collections.

### 7.3 Collection page — `/collections/[slug]`

Include:

- collection title;
- hero/cover image when configured;
- optional description;
- product grid;
- filters;
- sort control;
- pagination or performant infinite loading.

### 7.4 Catalogue / shop — `/shop`

All active products.

Provide:

- product search;
- filters;
- sorting;
- responsive product grid.

Potential filters include:

- collection;
- material;
- product type;
- colour;
- size;
- availability;
- price range;
- tags.

Filters should be generated from product metadata rather than being completely hard-coded.

Suggested sort options:

- featured;
- newest;
- price low-to-high;
- price high-to-low;
- best selling if sales data is available;
- highest rated if reviews are enabled.

### 7.5 Product page — `/products/[slug]`

Must support:

- product title;
- collection/category context;
- image gallery;
- image zoom/full-screen viewing;
- optional variant-specific imagery;
- price;
- compare-at/sale price if configured;
- selected currency;
- tax-display messaging;
- configurable product options;
- quantity;
- stock/made-to-order indication;
- estimated processing time;
- add to cart;
- description;
- materials/care/details;
- dimensions where relevant;
- shipping/returns summary;
- tags/metadata where useful;
- reviews/rating;
- related products;
- breadcrumbs.

Changing a variant or option that affects price must update the displayed estimated price immediately, but final price must be server-validated when adding/updating checkout.

### 7.6 Cart — `/cart`

Display:

- cart lines;
- product image;
- product title;
- selected configuration/options;
- unit price;
- quantity controls;
- remove action;
- subtotal;
- discounts;
- estimated tax status;
- estimated shipping where enough destination information is known;
- destination/country selector if useful;
- checkout CTA.

The cart must clearly distinguish an **estimate** from the final checkout calculation when the shipping address is not yet known.

### 7.7 Checkout — `/checkout`

Support guest checkout in v1.

Collect:

- email;
- first/last name;
- phone where needed for delivery;
- shipping address;
- optional separate billing address;
- country;
- postal code;
- delivery-related information if needed;
- marketing opt-in as a separate, unticked consent;
- payment details through Stripe;
- policy acceptance where legally appropriate.

The **shipping destination**, not billing destination, is the commerce destination used for Macmaer shipping and configured VAT/tax rules.

On shipping-country/postal changes:

1. recalculate applicable shipping;
2. recalculate VAT/tax;
3. revalidate available shipping destination;
4. update order summary.

Before payment is initiated, calculate totals server-side and create/update a checkout/order record.

### 7.8 Checkout success — `/order/[public-token]/success`

Show:

- order number;
- payment/order status;
- order summary;
- shipping destination summary;
- confirmation email message;
- expected processing estimate;
- support/contact information.

Do not expose sequential order IDs directly as authorization tokens.

### 7.9 Static/content pages

At minimum:

- `/about`
- `/contact`
- `/faq`
- `/policies`
- `/policies/privacy`
- `/policies/terms`
- `/policies/shipping`
- `/policies/returns`
- `/policies/taxes`

The current Macmaer site can be used as migration/reference content.

---

## 8. Destination and currency context

Country and currency are separate concepts.

### 8.1 Supported currencies

Initial currencies:

- SEK
- EUR
- USD

### 8.2 Base currency

Use **SEK as the canonical/base product currency** unless the store owner explicitly changes this during implementation.

### 8.3 Currency selection

A visible currency selector should be accessible from the storefront header or equivalent UI.

The selection should persist, e.g. cookie/local preference.

Changing currency should update prices throughout:

- listings;
- product pages;
- cart;
- checkout.

### 8.4 Exchange-rate strategy

Implement an abstraction for exchange rates.

Recommended model:

- canonical prices stored in SEK;
- fetch EUR/SEK and USD/SEK rates from a configurable FX provider;
- cache rates;
- store timestamp/source;
- allow an admin markup/rounding strategy if desired;
- lock the rate used once the order is created for payment.

Optional later enhancement:

Allow explicit per-currency product price overrides so the store can use stable psychological prices rather than continuously converted values.

### 8.5 Country/destination selector

The storefront should maintain a shopping destination country separately from currency.

Possible initial behaviour:

- default to Sweden or a best-effort geo-detected country;
- allow the user to override it;
- use this only for price/tax/shipping estimates;
- the shipping address entered at checkout is authoritative.

Never assume EUR means EU, or USD means USA.

---

## 9. Product system

The product system must be substantially more flexible than a single fixed product schema.

### 9.1 Product core fields

A product should support at least:

- `id`
- `slug`
- `title`
- `subtitle` optional
- `short_description`
- `description`
- `status`: draft / active / archived
- base price
- compare-at price optional
- base currency
- SKU optional at product level
- tax category
- inventory strategy
- processing-time text/range
- weight
- dimensions optional
- primary image
- image gallery
- SEO title
- SEO description
- created/updated timestamps

### 9.2 Collections

Products can belong to multiple collections.

Collection fields:

- name;
- slug;
- description;
- hero image;
- active status;
- manual sort order;
- SEO metadata.

### 9.3 Tags

Support arbitrary product tags.

Examples:

- boucle;
- velvet;
- knot-pillow;
- reversible;
- handmade;
- neutral;
- limited-edition;
- accessory.

Tags can support filtering, related products and internal merchandising.

### 9.4 Product types

Do not encode each product type as a separate database table/application component.

Instead use a generic product/options/variant model capable of representing different products.

Examples:

#### Example A — simple product

No customer options.

#### Example B — size variant

Customer selects:

- Small
- Medium
- Large

Each size may have a different price/SKU/stock/weight.

#### Example C — colour + size variants

Customer selects a colour and size combination.

Each valid combination may map to a SKU and/or stock record.

#### Example D — configurable product without SKU explosion

Customer selects:

- fabric colour;
- clasp colour;
- optional personalization.

These selections should be stored on the order item even if they do not correspond to separate stock SKUs.

#### Example E — fixed pack with repeated selections

Example: a pack of five accessories where the buyer chooses the colour five times.

The option system must support something equivalent to:

- Colour 1
- Colour 2
- Colour 3
- Colour 4
- Colour 5

all drawing values from the same colour option set, including the possibility of selecting the same colour more than once if allowed.

Do not model this as hundreds/thousands of Cartesian product variants.

### 9.5 Option definitions

Support reusable or product-local option definitions.

Suggested option UI types:

- select/dropdown;
- radio/buttons;
- colour swatch;
- image swatch;
- checkbox;
- short text;
- numeric input;
- repeated select group.

Each option should support relevant metadata such as:

- label;
- internal key;
- required/optional;
- display type;
- values;
- display order;
- whether it is a variant axis;
- whether it affects price;
- whether it affects weight;
- min/max selection rules;
- repeat count;
- validation rules.

### 9.6 Option values

An option value may support:

- label;
- key;
- optional colour hex;
- optional swatch/image;
- optional price delta;
- optional weight delta;
- active/inactive status;
- sort order.

### 9.7 Variants

A variant represents a stock/SKU-level purchasable combination where needed.

Variant fields should include:

- ID;
- product ID;
- SKU;
- option-value combination;
- price override or delta;
- compare-at price optional;
- weight override;
- inventory strategy;
- stock quantity if tracked;
- image override optional;
- active status.

### 9.8 Inventory strategies

Support at least:

- `TRACKED` — limited stock quantity;
- `MADE_TO_ORDER` — purchasable without conventional inventory, with processing time;
- `UNLIMITED` — no inventory constraint;
- `UNAVAILABLE`/archived behaviour.

Macmaer currently emphasizes handmade/made-to-order products, so made-to-order should be a first-class state rather than pretending every item is warehouse stock.

### 9.9 Product images

Support:

- multiple images;
- drag/reorder;
- primary image;
- alt text;
- optional variant association;
- image deletion when no longer used;
- optimized delivery through Next.js/image/CDN behaviour.

---

## 10. Cart model

A cart line must be uniquely defined by more than product ID.

It should snapshot/reference:

- product ID;
- variant ID if applicable;
- selected configurable options;
- quantity;
- current server-evaluated price data.

Two items with different custom selections must appear as separate cart lines even if they refer to the same product/variant.

### Cart persistence

Preferred design:

- anonymous cart identifier stored securely in a cookie;
- cart persisted server-side, or a server-validation design that provides equivalent reliability;
- future customer-login cart merging should remain possible.

At minimum, cart state must survive refresh/navigation.

---

## 11. Tax / VAT engine

Tax logic is a commerce-critical domain and must be isolated in a dedicated service/module.

### 11.1 Key requirement

Tax calculation is based on the **shipping destination** according to the store's configured tax strategy.

Billing address must not silently override shipping-destination tax logic.

### 11.2 Configuration rather than assumptions

The store is based in Sweden and sells B2C internationally.

The tax engine must support configurable EU treatment because Swedish/EU distance-selling rules can depend on the seller's OSS/distance-sales status.

Support at least these conceptual modes:

1. **Swedish-origin EU VAT mode**  
   Apply Swedish VAT to qualifying EU B2C sales when configured/legal for the business.

2. **EU destination/OSS mode**  
   Apply the VAT rate applicable to the EU shipping destination.

3. **Non-EU export mode**  
   Charge no Swedish/EU VAT where the configured rules treat the sale as VAT-free export; clearly tell the customer that import tax/duty may be charged by the destination country.

The actual active mode must be a store setting reviewed by the shop owner/accountant before production.

### 11.3 Tax tables

Suggested tax-rule fields:

- country code;
- optional region/state code for future use;
- product tax category;
- tax rate;
- valid-from date;
- valid-to date optional;
- price-display mode;
- enabled status;
- source/notes optional.

Avoid scattering country-rate constants throughout components.

### 11.4 Tax categories

Allow products to reference a tax category rather than directly storing a VAT percentage.

Initial store may only need a standard-goods category, but the model should permit additional categories later.

### 11.5 Inclusive/exclusive display

The storefront should support destination-appropriate price presentation.

For example, the current Macmaer business pattern is:

- EU customers: prices shown including VAT;
- non-EU customers: VAT excluded.

Implement this as configurable presentation logic rather than embedding it into product prices.

### 11.6 Tax snapshots and reporting

Orders must store enough information to produce reports by:

- order date;
- shipping country;
- net amount;
- tax rate;
- tax amount;
- gross amount;
- currency;
- base-currency equivalent where available;
- tax mode.

Provide CSV export from admin for accounting/OSS support.

### 11.7 Legal caution

The application should implement configured business rules accurately, but Codex should not invent tax policy.

Seed data and production VAT strategy must be explicitly reviewed before launch.

Relevant official references:

- European Commission OSS: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en
- Skatteverket OSS: https://www.skatteverket.se/servicelankar/otherlanguages/englishengelska/businessesandemployers/startingandrunningaswedishbusiness/declaringtaxesbusinesses/vat/applytoreportdistancesalesthroughonestopshoposs.html

---

## 12. Shipping engine

Shipping logic must also be isolated from UI components.

### 12.1 Key requirement

Shipping price is based on **shipping destination** and configurable order/package properties.

The existing Macmaer shop currently describes shipping price as depending on shipping area plus package size/weight, with tracked shipment. Preserve that capability.

### 12.2 Initial implementation

Implement configurable table-based shipping rather than carrier APIs in v1.

Support:

- shipping zones;
- countries assigned to zones;
- weight ranges;
- optional order-subtotal conditions;
- optional package-size classes;
- fixed shipping fees;
- free-shipping thresholds;
- active/inactive services;
- estimated delivery windows;
- tracked-service labels.

### 12.3 Shipping zones

Possible initial zones:

- Sweden;
- EU;
- UK;
- USA/Canada;
- Australia/New Zealand;
- Japan/South Korea;
- other supported international destinations.

These are examples only. The admin must control actual groupings.

### 12.4 Country allow-list

Maintain a configurable list of countries the shop currently ships to.

If a destination is not supported:

- prevent checkout;
- provide a friendly message/contact route.

### 12.5 Weight calculation

Order shipping weight should be calculated from:

- product/variant base weight;
- option weight adjustments if configured;
- quantity;
- optional packaging allowance/rule.

### 12.6 Shipping snapshots

Order should store:

- selected shipping service;
- rule/zone used;
- shipping amount;
- estimated delivery text;
- tracking number once fulfilled;
- carrier name/reference.

### 12.7 Future extension

Design the shipping service behind an interface so carrier-rate APIs can be introduced later without rewriting checkout.

---

## 13. Discounts and promotions

Implement a simple discount system in v1.

Support:

- percentage discount;
- fixed-amount discount;
- start/end dates;
- active/inactive state;
- usage limits optional;
- minimum cart subtotal optional;
- product/collection restrictions optional;
- single-use/customer limitations optional where practical.

All discount eligibility and amounts must be server calculated.

Also support product-level compare-at/sale pricing independently of coupon codes.

---

## 14. Checkout and order creation flow

Recommended flow:

1. customer configures products and cart;
2. customer enters shipping destination;
3. server validates all cart lines;
4. server resolves current canonical prices;
5. server applies valid discounts;
6. server determines shipping;
7. server determines tax/VAT;
8. server converts/locks currency amounts where applicable;
9. server creates a pending order with immutable pricing snapshot;
10. server creates one Stripe PaymentIntent for that order/payment attempt strategy;
11. customer completes Stripe payment UI;
12. Stripe asynchronously reports result by webhook;
13. webhook marks payment/order paid or failed;
14. successful payment triggers confirmation workflows;
15. admin receives new-order notification.

Avoid creating duplicate orders through repeated button presses/page refreshes.

Use appropriate idempotency keys.

---

## 15. Order lifecycle

Keep order state and payment state conceptually separate.

### 15.1 Suggested order states

- `PENDING_PAYMENT`
- `PAID`
- `PROCESSING`
- `READY_TO_SHIP`
- `SHIPPED`
- `DELIVERED` optional/manual
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

### 15.2 Suggested payment states

- `NOT_STARTED`
- `REQUIRES_PAYMENT`
- `PROCESSING`
- `SUCCEEDED`
- `FAILED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `DISPUTED` if relevant.

### 15.3 Order numbering

Generate human-friendly order numbers separate from database UUIDs.

Example:

`MAC-2026-001234`

Do not use the order number itself as an authorization secret.

---

## 16. Stripe payment integration

### 16.1 General

Use Stripe for payment collection.

Prefer an embedded, branded checkout experience through Payment Element/PaymentIntents unless implementation simplicity or supported methods clearly favors hosted Stripe Checkout.

### 16.2 Required handling

Handle at minimum:

- successful payment;
- failed payment;
- abandoned/incomplete payment;
- authentication-required flows;
- webhook retries;
- full refund;
- partial refund;
- refund failure/update;
- dispute signal where practical.

### 16.3 Webhooks

Create a dedicated Stripe webhook route.

Record processed Stripe event IDs to enforce idempotency.

Relevant events depend on final integration, but include payment success/failure and refund events.

Official references:

- PaymentIntents: https://docs.stripe.com/api/payment_intents
- Webhooks: https://docs.stripe.com/webhooks
- Refunds: https://docs.stripe.com/refunds

### 16.4 Refunds

Admin order page should support:

- full refund;
- partial refund amount or selected lines where practical;
- optional stock restoration when relevant;
- refund reason/note;
- Stripe refund status.

Do not mark an order refunded merely because an admin clicked a button; wait for confirmed provider state and handle failed/refund-updated webhooks.

---

## 17. Private shop administration frontend

Use an authenticated route group such as `/admin`.

### 17.1 Authentication

Initial requirement:

- shop administrators only;
- Supabase Auth;
- role/allow-list check;
- no public sign-up to admin;
- secure sessions;
- authorization checked on the server, not only hidden in UI.

Optional later:

- 2FA;
- multiple staff roles.

### 17.2 Admin dashboard — `/admin`

Show useful shop information such as:

- new/unfulfilled orders;
- recent orders;
- revenue summary;
- orders by status;
- products with low stock;
- latest reviews;
- quick actions.

Do not overbuild analytics in v1.

### 17.3 Products — `/admin/products`

Features:

- search;
- filter by status/collection/tag;
- create;
- edit;
- duplicate;
- archive;
- preview.

### 17.4 Product editor

The editor must support:

- title/slug;
- descriptions;
- status;
- base price;
- compare-at price;
- inventory strategy;
- SKU;
- weight/dimensions;
- processing time;
- tax category;
- collections;
- tags;
- images;
- SEO fields;
- product options;
- variants;
- option value ordering;
- price/weight deltas;
- variant-specific images;
- related/featured flags where implemented.

The UX must make it possible for a non-developer shop owner to create a product with arbitrary sensible combinations of options.

### 17.5 Image manager

Within product/content management:

- upload images;
- preview;
- reorder;
- set primary;
- edit alt text;
- remove;
- validate file size/type;
- generate unique storage paths.

### 17.6 Collections — `/admin/collections`

Create/edit/archive collections and configure:

- title;
- slug;
- description;
- hero image;
- products/order;
- SEO.

### 17.7 Tags — `/admin/tags`

Create/rename/merge/delete unused tags where safe.

### 17.8 Orders — `/admin/orders`

List/search/filter by:

- order number;
- customer email/name;
- date;
- status;
- destination country;
- payment state;
- fulfilment state.

### 17.9 Order detail — `/admin/orders/[id]`

Show:

- full order snapshot;
- selected product options;
- customer contact;
- shipping address;
- billing address if supplied;
- tax breakdown;
- discount breakdown;
- shipping breakdown;
- payment provider IDs/status;
- timeline/events;
- internal notes;
- refund controls;
- fulfilment controls;
- tracking number/carrier;
- resend relevant email action where safe.

### 17.10 Shipping settings — `/admin/settings/shipping`

Manage:

- supported countries;
- zones;
- shipping services;
- weight bands;
- prices;
- free-shipping thresholds;
- estimated delivery text;
- active/inactive rules.

### 17.11 Tax settings — `/admin/settings/tax`

Manage/review:

- EU VAT mode;
- tax categories;
- destination rates;
- effective dates;
- non-EU export treatment;
- price display settings.

Protect this section from accidental changes with clear warnings.

### 17.12 Currency settings — `/admin/settings/currency`

Manage:

- active currencies;
- base currency;
- FX source/status;
- conversion markup optional;
- rounding behaviour;
- optional manual product-price overrides later.

### 17.13 Store content — `/admin/content`

Provide lightweight content management for frequently changed public content such as:

- announcement bar;
- homepage hero;
- featured collections;
- featured products;
- testimonials;
- FAQ entries;
- selected static-page copy where practical.

Do not build a generic drag-and-drop page builder.

---

## 18. Reviews and testimonials

The existing site contains product ratings/reviews and homepage testimonials, so preserve this capability.

### Product reviews

Support:

- rating 1–5;
- review title optional;
- review body;
- customer display name;
- created date;
- approved/pending/rejected status;
- optional verified-purchase flag.

Public submissions should require moderation before display unless the implementation uses a sufficiently safe verified-order flow.

### Migration

Where possible migrate existing WooCommerce product reviews while preserving:

- author/display name;
- rating;
- text;
- approximate original date;
- product association.

### Homepage testimonials

Allow selected reviews or manually entered testimonials to be featured on the landing page.

---

## 19. Customer accounts

Customer accounts are **not required for v1**.

Guest checkout should be the default to reduce friction.

Design order/customer relationships so customer accounts can be added later without schema replacement.

Potential later capabilities:

- order history;
- saved addresses;
- faster checkout;
- saved favorites/wishlist.

---

## 20. Transactional email

Implement templated responsive emails for:

- order confirmation after confirmed payment;
- payment failure/incomplete payment where useful;
- order shipped + tracking;
- refund initiated/completed as appropriate;
- contact form submission acknowledgment optional;
- admin new-order notification.

Emails should use Macmaer branding and avoid depending on WordPress templates.

Record important email-send attempts/status where useful for support/debugging.

---

## 21. Fulfilment and tracking

Admin should be able to:

1. open a paid order;
2. move it to processing;
3. mark ready to ship;
4. enter carrier name;
5. enter tracking number and optional tracking URL;
6. mark shipped;
7. trigger shipping confirmation email.

Future carrier integration should be possible without replacing order tables.

---

## 22. Search and discovery

### Search

Implement catalogue search across at least:

- title;
- description/short description;
- tags;
- collection names where practical.

For the current catalogue size, Postgres search is sufficient; do not introduce Algolia/Elasticsearch without a demonstrated need.

### Related products

Generate related products using a sensible combination of:

- collection;
- tags;
- material/type;
- manual associations if later added.

---

## 23. SEO requirements

The migration must avoid unnecessarily losing existing search visibility.

### Required

- server-rendered/indexable product and collection pages;
- unique title/description metadata;
- canonical URLs;
- Open Graph metadata;
- sitemap.xml;
- robots.txt;
- semantic headings;
- image alt text;
- Product structured data where valid;
- BreadcrumbList structured data where valid;
- Organization/WebSite structured data where appropriate;
- performant pages/Core Web Vitals focus.

### URL migration

Before production cutover:

1. export/crawl existing WordPress URLs;
2. create a redirect map from important legacy URLs to new routes;
3. implement permanent redirects;
4. avoid changing URLs unnecessarily where preserving them is straightforward.

Important legacy groups include:

- product URLs;
- product-category URLs;
- product-tag URLs;
- policy/about/FAQ pages.

---

## 24. Performance requirements

The rebuild should feel materially faster than the WordPress/Elementor site.

### Principles

- minimize client-side JavaScript;
- use Server Components where possible;
- optimize images;
- responsive image sizes;
- lazy-load below-the-fold media;
- avoid blocking third-party scripts;
- cache catalogue/content appropriately;
- invalidate/revalidate after admin changes;
- paginate large data sets;
- avoid unnecessary database round trips.

### Target

Aim for good Core Web Vitals on real mobile connections, especially:

- LCP;
- INP;
- CLS.

Do not sacrifice usability for synthetic benchmark perfection.

---

## 25. Accessibility

Target WCAG 2.1 AA good practices.

Required basics:

- keyboard navigation;
- visible focus states;
- semantic form controls;
- proper labels/errors;
- alt text;
- sufficient contrast;
- non-colour-only option identification;
- accessible dialogs/galleries;
- reduced-motion support where relevant;
- logical heading structure.

Colour swatches must include text/accessible names.

---

## 26. Privacy, GDPR and security

### 26.1 Data minimization

Collect only information needed for:

- order fulfilment;
- customer communication;
- legal/accounting requirements;
- explicitly consented marketing.

### 26.2 Marketing consent

Marketing/newsletter consent must be separate from checkout terms and should not be preselected.

### 26.3 Cookies

Prefer privacy-friendly analytics and minimize non-essential cookies.

If non-essential tracking is introduced, implement appropriate consent handling.

### 26.4 Admin security

- server-side authorization on every protected action;
- RLS where appropriate;
- validate uploads;
- rate limit sensitive/public write endpoints;
- CSRF-safe patterns consistent with Next.js architecture;
- no secret data in client bundles;
- audit critical admin actions where useful.

### 26.5 Payment security

All card entry/payment-sensitive UI must be handled by Stripe-hosted elements/flows.

Our database stores Stripe object IDs and statuses, never PAN/CVC data.

---

## 27. Observability and error handling

Provide structured logging for critical workflows:

- checkout calculation failures;
- Stripe API failures;
- webhook failures;
- email failures;
- image upload failures;
- admin mutation failures.

Use an error-monitoring service such as Sentry if available/desired.

Public errors must be friendly and must not expose stack traces/secrets.

Commerce-critical failures should provide enough internal context for diagnosis.

---

## 28. Suggested database model

Exact naming may change, but the relational model should cover the following concepts.

### Identity/admin

- `profiles`
- `admin_roles` or role field

### Catalogue

- `products`
- `product_images`
- `collections`
- `product_collections`
- `tags`
- `product_tags`
- `product_options`
- `product_option_values`
- `product_variants`
- `variant_option_values`

### Reviews/content

- `reviews`
- `testimonials` or testimonial configuration
- `content_blocks`
- `faq_items`

### Commerce

- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_events`
- `payments`
- `refunds`
- `processed_webhook_events`

### Shipping

- `shipping_zones`
- `shipping_zone_countries`
- `shipping_methods`
- `shipping_rate_rules`

### Tax

- `tax_categories`
- `tax_rules`
- `tax_settings`

### Promotions

- `discounts`
- `discount_redemptions`

### Store configuration

- `store_settings`
- `currency_rates`

### Optional accounting/support

- `email_events`
- `admin_audit_log`

---

## 29. Important order schema considerations

`orders` should include fields conceptually similar to:

- UUID;
- public order number;
- public lookup token if needed;
- created timestamp;
- email;
- customer name;
- phone;
- shipping address JSON/normalized fields;
- billing address JSON/normalized fields;
- shipping country;
- order status;
- payment status;
- currency;
- base currency;
- locked exchange rate;
- subtotal;
- discount total;
- shipping total;
- tax total;
- grand total;
- base-currency reporting totals where appropriate;
- shipping method snapshot;
- tax mode snapshot;
- Stripe customer ID optional;
- Stripe PaymentIntent ID;
- tracking fields;
- internal note fields;
- timestamps.

`order_items` should snapshot:

- original product/variant IDs for reference;
- title;
- SKU;
- image reference;
- selected-option JSON;
- quantity;
- unit net/gross amounts as appropriate;
- discount allocation;
- tax category;
- tax rate;
- tax amount;
- line total;
- weight snapshot.

Do not depend on live product records to display a completed order.

---

## 30. Service/module boundaries

Do not place all business logic directly inside route handlers/components.

Create clear modules such as:

- `catalog`
- `pricing`
- `currency`
- `tax`
- `shipping`
- `discounts`
- `cart`
- `checkout`
- `orders`
- `payments/stripe`
- `refunds`
- `fulfilment`
- `email`
- `media`

Suggested core pure functions/services should be testable without rendering React.

For example:

```ts
calculateLinePrice(...)
calculateDiscounts(...)
calculateShipping(...)
calculateTax(...)
convertCurrency(...)
calculateCheckoutTotals(...)
```

---

## 31. API/server-action principles

Use Next.js Server Actions and/or route handlers where appropriate.

Regardless of transport:

- validate all input;
- authenticate/authorize admin calls;
- recalculate financial data server-side;
- return typed errors;
- protect idempotent operations;
- use transactions for multi-step database mutations where needed.

Potential endpoints/actions include:

### Public

- resolve catalogue/filter data;
- create/update cart;
- calculate checkout quote;
- create payment attempt;
- submit review;
- contact form.

### Webhooks

- Stripe webhook.

### Admin

- CRUD product;
- upload/delete media;
- CRUD collection/tag;
- order status mutation;
- refund action;
- fulfilment action;
- shipping/tax settings;
- content settings;
- CSV exports.

---

## 32. Admin CSV/report exports

Provide at least basic exports for:

### Orders export

Fields such as:

- order number;
- order date;
- status;
- customer country;
- currency;
- net;
- tax;
- shipping;
- discounts;
- gross total;
- payment status.

### VAT/tax export

Groupable/filterable by:

- reporting period;
- destination country;
- tax rate;
- net sales;
- VAT amount;
- currency/base-currency value.

This is valuable for accounting and OSS reporting and should be considered part of the commerce system rather than an afterthought.

---

## 33. Migration from current WordPress/WooCommerce site

Create migration tooling/scripts rather than re-entering everything manually where feasible.

### Migrate

- products;
- titles/descriptions;
- prices;
- product images;
- categories/collections;
- tags;
- product attributes/options;
- SKUs where present;
- product reviews;
- relevant static content;
- SEO metadata where useful;
- legacy URL map.

### Product migration caveat

WooCommerce add-ons/custom fields may not map 1:1 to variants.

Migration should convert each product to the new generic option model and flag ambiguous cases for manual review.

### Orders/customers

Historical order migration is optional for initial storefront launch, but evaluate whether the owner needs old orders accessible in the new admin.

A reasonable approach is:

- keep an export/archive of historical WooCommerce records;
- migrate only what is operationally useful;
- do not delay storefront replacement solely to perfectly recreate every historical WooCommerce object.

---

## 34. Business rules inspired by current Macmaer site

Use these as migration requirements/initial defaults to verify with the store owner, not immutable code constants.

Current public site indicates patterns including:

- handmade/made-to-order products;
- standard and custom/personalized orders;
- collections based on materials/styles;
- tracked shipping;
- international shipping;
- shipping rates influenced by package size/weight and destination;
- free domestic shipping threshold;
- EU VAT-inclusive presentation;
- non-EU VAT-free presentation with destination import charges potentially payable by customer;
- different return eligibility for standard versus custom/personalized/sale goods.

Represent relevant return/customization state in product/order data so customer service can understand why a line may have different return treatment.

Consider a product field such as:

- `return_policy_class`: standard / customized / final_sale

or an equivalent snapshot-able rule.

---

## 35. Legal/policy content behaviour

Policy pages should be editable without changing application code where practical.

Checkout should link clearly to:

- terms;
- privacy policy;
- shipping policy;
- return policy;
- tax/customs information.

For non-EU orders, clearly communicate if local customs/import VAT/duties are **not** collected by Macmaer and may be charged on import.

Do not claim a tax/duty treatment unless configured and legally reviewed.

---

## 36. Nice-to-have features after v1

Do not allow these to delay core launch.

- customer accounts;
- wishlists;
- abandoned-cart emails;
- back-in-stock notifications;
- automatic carrier rate quotes;
- shipping label purchasing;
- advanced analytics dashboard;
- product bundles;
- gift cards;
- localized languages;
- additional currencies;
- automatic/manual per-currency price books;
- address autocomplete;
- Instagram/social gallery;
- inventory low-stock notifications;
- automatic review-request emails;
- customer self-service order tracking;
- return request portal;
- newsletter integration;
- product recommendations.

---

## 37. Automated testing requirements

Commerce-critical logic requires tests.

### 37.1 Unit tests

At minimum test:

- product-option pricing;
- variant pricing;
- repeated option selections;
- discounts;
- currency conversion/rounding;
- Swedish/EU/non-EU tax modes;
- tax-inclusive/exclusive conversion;
- shipping zone selection;
- shipping weight bands;
- free-shipping thresholds;
- checkout totals.

Include boundary cases.

### 37.2 Integration tests

Test:

- checkout creates correct pending order;
- Stripe intent amount equals locked order total;
- successful webhook marks order paid once;
- duplicate webhook does not duplicate side effects;
- failed payment does not mark paid;
- partial/full refund state;
- admin-only mutations reject public users;
- archived/unavailable products cannot be newly purchased;
- product changes after order creation do not alter order snapshot.

### 37.3 End-to-end tests

Critical user paths:

1. browse → configure product → cart;
2. change currency;
3. checkout in Sweden;
4. checkout in another EU country;
5. checkout outside EU;
6. successful Stripe test payment;
7. failed Stripe test payment;
8. admin creates/edits product with variants;
9. admin fulfills order;
10. admin performs refund.

---

## 38. Acceptance criteria for v1

The first production-ready version is complete when all of the following are true.

### Storefront

- [ ] Home page is responsive and uses the new Macmaer design system.
- [ ] Collections and catalogue are browseable.
- [ ] Search/filter/sort work.
- [ ] Product pages support simple, variant and configurable products.
- [ ] Repeated selection options are supported.
- [ ] Product images are responsive and optimized.
- [ ] SEK/EUR/USD selector works across the storefront.
- [ ] Cart persists and preserves product configurations.
- [ ] Shipping country drives shipping/tax calculation.
- [ ] Checkout works as guest.
- [ ] Stripe test-mode payment succeeds/fails correctly.
- [ ] Confirmation page and emails are correct.

### Admin

- [ ] Secure admin login.
- [ ] Product CRUD/archive.
- [ ] Image upload/reorder/alt text.
- [ ] Collections/tags management.
- [ ] Flexible options and variants editor.
- [ ] Orders list/detail.
- [ ] Fulfilment/tracking workflow.
- [ ] Full and partial refund workflow.
- [ ] Shipping rules editor.
- [ ] Tax configuration editor.
- [ ] Basic homepage/content management.
- [ ] Order/tax CSV export.

### Reliability/security

- [ ] Financial totals are server-authoritative.
- [ ] Order snapshots are immutable enough for historical accuracy.
- [ ] Stripe webhooks verify signatures and are idempotent.
- [ ] Admin authorization is server-enforced.
- [ ] No payment-card data is stored.
- [ ] Commerce-critical tests pass.
- [ ] Production secrets are correctly configured.

### Migration/launch

- [ ] Current products/content/images are migrated or intentionally replaced.
- [ ] Existing high-value URLs have redirects.
- [ ] SEO metadata/sitemap/robots are configured.
- [ ] Tax mode/rates are reviewed by store owner/accountant.
- [ ] Shipping zones/rates are reviewed by store owner.
- [ ] Stripe production configuration/webhooks are tested.
- [ ] Privacy/terms/shipping/returns/tax content is reviewed before launch.

---

## 39. Recommended implementation phases

Codex should implement this incrementally rather than attempting the entire application in one undifferentiated pass.

### Phase 0 — Repository and foundations

- Next.js + TypeScript setup;
- Tailwind/design tokens;
- lint/format/test tooling;
- Supabase clients;
- environment-variable validation;
- baseline route structure;
- shared UI primitives.

### Phase 1 — Catalogue and public design

- database catalogue schema;
- product/collection seed data;
- homepage;
- catalogue;
- collections;
- product pages;
- responsive header/footer;
- image system;
- search/filter/sort.

Use representative products covering different option types.

### Phase 2 — Admin catalogue

- admin authentication/authorization;
- product CRUD;
- collection/tag CRUD;
- media upload;
- generic option editor;
- variant editor;
- content/featured product controls.

### Phase 3 — Cart, destination and currency

- cart persistence;
- pricing service;
- country context;
- currency selector;
- FX service;
- server-side cart validation.

### Phase 4 — Shipping, tax and discounts

- shipping schema/service/admin;
- tax schema/service/admin;
- discount system;
- comprehensive unit tests.

### Phase 5 — Checkout and Stripe

- checkout form;
- pending-order creation;
- PaymentIntent integration;
- webhook processing;
- payment success/failure states;
- confirmation page;
- payment tests.

### Phase 6 — Orders, fulfilment and refunds

- admin orders;
- order timeline;
- tracking/fulfilment;
- Stripe refunds;
- transactional emails;
- CSV exports.

### Phase 7 — Reviews, SEO and migration

- reviews/testimonials;
- structured data;
- metadata;
- redirects;
- WordPress/WooCommerce migration scripts;
- content cleanup.

### Phase 8 — Production hardening

- e2e tests;
- accessibility pass;
- performance pass;
- error monitoring;
- security review;
- backup/operational checks;
- Stripe production mode;
- production data/rule verification.

---

## 40. Codex implementation instructions

When implementing this specification:

1. **Do not invent business-critical rates or policies.** Put uncertain tax/shipping data in configuration/seed files and mark for owner verification.
2. **Do not trust browser prices.** Recalculate totals server-side.
3. **Do not use JavaScript floating-point arithmetic for financial totals.**
4. **Do not store card details.** Use Stripe-hosted payment fields/flows.
5. **Do not mark payment successful from client redirects.** Use verified Stripe webhook state.
6. **Make webhook handling idempotent.**
7. **Snapshot financial/order data.**
8. **Archive rather than hard-delete products referenced by orders.**
9. **Prefer simple code and explicit domain services over unnecessary frameworks.**
10. **Use database migrations for schema changes.**
11. **Use TypeScript strict mode and runtime input validation.**
12. **Keep Supabase service-role operations server-only.**
13. **Apply RLS/authorization intentionally rather than assuming obscurity.**
14. **Write automated tests before considering tax/shipping/payment functionality complete.**
15. **Optimize for a small real store, not hypothetical marketplace scale.**
16. **Keep public storefront design custom and premium; do not make it look like an admin dashboard.**
17. **Keep product configuration generic enough to model future Macmaer products without code changes.**
18. **Ask for a business decision only when the implementation truly requires it; otherwise use a safe configurable default and document the assumption.**
19. **Maintain a `DECISIONS.md` or equivalent record for implementation choices and unresolved production configuration.**
20. **Maintain a concise README containing local setup, Supabase setup, Stripe test setup, environment variables, migrations, tests and deployment instructions.**

---

## 41. Configuration decisions to verify before production

These do not need to block initial development, but they must be resolved before launch.

### Commerce

- exact current product catalogue to migrate;
- canonical product pricing;
- whether SEK prices are VAT-inclusive internally;
- sale/discount behaviour;
- inventory vs made-to-order behaviour by product;
- custom/final-sale return classifications.

### VAT/tax

- active Swedish/EU VAT strategy;
- OSS registration/status;
- current applicable VAT rates by destination/product category;
- tax-inclusive storefront display rules;
- non-EU export treatment;
- whether any destination taxes/duties should ever be prepaid/collected.

### Shipping

- countries currently supported;
- shipping zones;
- weight/size rules;
- rates;
- Swedish free-shipping threshold;
- packaging weight assumptions;
- carriers/tracking URL formats;
- processing and estimated delivery times.

### Payments

- Stripe account/business setup;
- desired payment methods;
- currencies actually charged through Stripe;
- refund policy/workflow;
- statement descriptor.

### Store content

- final brand fonts/colours;
- homepage content;
- existing testimonials/reviews to retain;
- social links;
- contact address/email information;
- policy wording.

---

## 42. Definition of success

The project succeeds if Macmaer can stop depending on WordPress/Elementor/WooCommerce for day-to-day storefront operation while retaining a professional worldwide e-commerce workflow.

The resulting site should:

- feel noticeably faster;
- look more premium and intentional;
- be simple for customers;
- give the shop owner a purpose-built administration experience;
- support the real flexibility of Macmaer's handmade/custom products;
- correctly handle configured shipping, currency and VAT logic;
- reliably accept and reconcile payments;
- preserve trustworthy order records;
- require dramatically less plugin/dependency maintenance than the current system.

The guiding principle is:

> **Build Macmaer's store, not another WooCommerce.**
