-- Separate customer-facing collections from WooCommerce child categories that
-- describe product types. Existing product associations stay intact: duplicate
-- source categories share one product_type_key and are grouped in the storefront.
create type public.catalogue_taxonomy_kind as enum ('collection', 'product_type');

alter table public.collections
  add column kind public.catalogue_taxonomy_kind not null default 'collection',
  add column product_type_key text;

update public.collections
set kind = 'product_type',
    product_type_key = case
      when slug = 'ball-knot-pillows-boucle' then 'ball-knot-pillows'
      when slug = 'flat-knot-pillows-boucle' then 'flat-knot-pillows'
      when slug in (
        'hair-accessories-boucle',
        'hair-accessories-velour',
        'hair-accessories-velvet'
      ) then 'hair-accessories'
      when slug = 'key-chains-velvet' then 'key-chains'
      when slug in (
        'non-reversible-knot-pillows-limited',
        'non-reversible-knot-pillows-velour',
        'non-reversible-knot-pillows-velvet'
      ) then 'non-reversible-knot-pillows'
      when slug in (
        'reversible-knot-pillows-boucle',
        'reversible-knot-pillows-limited',
        'reversible-knot-pillows-velour',
        'reversible-knot-pillows-velvet'
      ) then 'reversible-knot-pillows'
    end
where slug in (
  'ball-knot-pillows-boucle',
  'flat-knot-pillows-boucle',
  'hair-accessories-boucle',
  'hair-accessories-velour',
  'hair-accessories-velvet',
  'key-chains-velvet',
  'non-reversible-knot-pillows-limited',
  'non-reversible-knot-pillows-velour',
  'non-reversible-knot-pillows-velvet',
  'reversible-knot-pillows-boucle',
  'reversible-knot-pillows-limited',
  'reversible-knot-pillows-velour',
  'reversible-knot-pillows-velvet'
);

-- The old representative catalogue used Cotton Velour as a collection. The
-- imported live catalogue uses the requested Velour collection instead.
update public.collections
set active = false
where slug = 'cotton-velour';

alter table public.collections
  add constraint collections_product_type_key_valid
    check (
      (kind = 'collection' and product_type_key is null)
      or
      (kind = 'product_type' and product_type_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    );

create index collections_kind_sort
  on public.collections(kind, sort_order, id)
  where active;

create index collections_product_type_key
  on public.collections(product_type_key)
  where active and kind = 'product_type';

comment on column public.collections.kind is
  'Customer-facing collection or product-type taxonomy entry.';
comment on column public.collections.product_type_key is
  'Groups collection-specific legacy categories into one product-type filter.';
