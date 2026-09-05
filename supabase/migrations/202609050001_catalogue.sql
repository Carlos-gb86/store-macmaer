-- Phase 1 only. All monetary fields are integer minor units in the product's currency.
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.inventory_strategy as enum ('TRACKED', 'MADE_TO_ORDER', 'UNLIMITED', 'UNAVAILABLE');
create type public.option_display_type as enum ('select', 'radio', 'colour_swatch', 'image_swatch', 'checkbox', 'short_text', 'number', 'repeated_select');

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  image_path text,
  image_alt text not null default '',
  active boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  subtitle text,
  short_description text not null default '',
  description text not null default '',
  materials text not null default '',
  care text not null default '',
  status public.product_status not null default 'draft',
  base_price integer not null check (base_price >= 0),
  compare_at_price integer check (compare_at_price >= base_price),
  currency text not null default 'SEK' check (currency in ('SEK', 'EUR', 'USD')),
  sku text unique,
  tax_category_key text,
  inventory_strategy public.inventory_strategy not null default 'MADE_TO_ORDER',
  stock_quantity integer check (stock_quantity >= 0),
  processing_time text,
  weight_grams integer check (weight_grams >= 0),
  dimensions jsonb not null default '{}' check (jsonb_typeof(dimensions) = 'object'),
  return_policy_class text not null default 'standard' check (return_policy_class in ('standard', 'customized', 'final_sale')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inventory_strategy <> 'TRACKED' or stock_quantity is not null)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
);
create table public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, collection_id)
);
create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

-- Product-local definitions; repeat_count reuses one value set without SKU multiplication.
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  key text not null,
  label text not null,
  display_type public.option_display_type not null,
  required boolean not null default true,
  is_variant_axis boolean not null default false,
  affects_price boolean not null default false,
  affects_weight boolean not null default false,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer check (max_selections >= min_selections),
  repeat_count integer not null default 1 check (repeat_count between 1 and 20),
  allow_duplicates boolean not null default true,
  validation_rules jsonb not null default '{}' check (jsonb_typeof(validation_rules) = 'object'),
  sort_order integer not null default 0,
  unique (product_id, key),
  unique (id, product_id),
  check (display_type = 'repeated_select' or repeat_count = 1),
  check (not is_variant_axis or display_type in ('select', 'radio', 'colour_swatch', 'image_swatch'))
);
create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null,
  product_id uuid not null,
  key text not null,
  label text not null,
  colour_hex text check (colour_hex ~ '^#[0-9a-fA-F]{6}$'),
  image_path text,
  price_delta integer not null default 0,
  weight_delta_grams integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (option_id, key),
  unique (id, option_id, product_id),
  foreign key (option_id, product_id) references public.product_options(id, product_id) on delete cascade
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  title text not null,
  price_override integer check (price_override >= 0),
  price_delta integer,
  compare_at_price integer check (compare_at_price >= 0),
  weight_override_grams integer check (weight_override_grams >= 0),
  inventory_strategy public.inventory_strategy not null default 'MADE_TO_ORDER',
  stock_quantity integer check (stock_quantity >= 0),
  active boolean not null default false,
  sort_order integer not null default 0,
  unique (id, product_id),
  check (price_override is null or price_delta is null),
  check (inventory_strategy <> 'TRACKED' or stock_quantity is not null)
);
create table public.variant_option_values (
  variant_id uuid not null,
  product_id uuid not null,
  option_id uuid not null,
  value_id uuid not null,
  primary key (variant_id, option_id),
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete cascade,
  foreign key (value_id, option_id, product_id) references public.product_option_values(id, option_id, product_id) on delete cascade
);
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid,
  path text not null,
  alt text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete cascade
);
create unique index one_primary_image_per_product on public.product_images(product_id) where is_primary;
create index products_public_sort on public.products(status, sort_order, id);
create index product_collections_reverse on public.product_collections(collection_id);
create index product_tags_reverse on public.product_tags(tag_id);
create index product_options_product on public.product_options(product_id);
create index product_option_values_option on public.product_option_values(option_id, product_id);
create index product_variants_product on public.product_variants(product_id);
create index product_images_product on public.product_images(product_id);
create index variant_option_values_value on public.variant_option_values(value_id, option_id, product_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
revoke execute on function public.set_updated_at() from public;

-- Deny all public writes, including signed-in users. Admin policies arrive in Phase 2.
alter table public.products enable row level security;
alter table public.collections enable row level security;
alter table public.tags enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_tags enable row level security;
alter table public.product_options enable row level security;
alter table public.product_option_values enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_option_values enable row level security;
alter table public.product_images enable row level security;

create policy public_products on public.products for select to anon, authenticated using (status = 'active');
create policy public_collections on public.collections for select to anon, authenticated using (active);
create policy public_product_tags on public.product_tags for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id));
create policy public_tags on public.tags for select to anon, authenticated using (exists (select 1 from public.product_tags pt where pt.tag_id = id));
create policy public_product_collections on public.product_collections for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id) and exists (select 1 from public.collections c where c.id = collection_id)
);
create policy public_options on public.product_options for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id));
create policy public_option_values on public.product_option_values for select to anon, authenticated using (active and exists (select 1 from public.products p where p.id = product_id));
create policy public_variants on public.product_variants for select to anon, authenticated using (active and exists (select 1 from public.products p where p.id = product_id));
create policy public_variant_values on public.variant_option_values for select to anon, authenticated using (
  exists (select 1 from public.product_variants v where v.id = variant_id) and exists (select 1 from public.product_option_values ov where ov.id = value_id)
);
create policy public_images on public.product_images for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id) and (variant_id is null or exists (select 1 from public.product_variants v where v.id = variant_id))
);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.products, public.collections, public.tags, public.product_collections, public.product_tags,
  public.product_options, public.product_option_values, public.product_variants, public.variant_option_values, public.product_images to anon, authenticated;
grant all on all tables in schema public to service_role;

-- A read model, with the caller's RLS, for the small Phase 1 catalogue.
create view public.catalogue_products with (security_invoker = true) as
select p.id, p.slug, p.sort_order, (
  to_jsonb(p) || jsonb_build_object(
    'images', coalesce((select jsonb_agg(to_jsonb(i) order by i.is_primary desc, i.sort_order, i.id) from public.product_images i where i.product_id = p.id), '[]'::jsonb),
    'options', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object(
      'values', coalesce((select jsonb_agg(to_jsonb(ov) order by ov.sort_order, ov.id) from public.product_option_values ov where ov.option_id = o.id), '[]'::jsonb)
    ) order by o.sort_order, o.id) from public.product_options o where o.product_id = p.id), '[]'::jsonb),
    'variants', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object(
      'value_ids', coalesce((select jsonb_agg(vov.value_id order by vov.option_id) from public.variant_option_values vov where vov.variant_id = v.id), '[]'::jsonb)
    ) order by v.sort_order, v.id) from public.product_variants v where v.product_id = p.id), '[]'::jsonb),
    'collections', coalesce((select jsonb_agg(c.slug order by c.sort_order, c.id) from public.product_collections pc join public.collections c on c.id = pc.collection_id where pc.product_id = p.id), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(t.slug order by t.slug) from public.product_tags pt join public.tags t on t.id = pt.tag_id where pt.product_id = p.id), '[]'::jsonb)
  )
) as document from public.products p;
grant select on public.catalogue_products to anon, authenticated, service_role;
