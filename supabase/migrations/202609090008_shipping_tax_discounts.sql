-- Phase 4: configurable shipping, destination VAT and promotions.
-- All configured prices are canonical SEK minor units. Catalogue prices are
-- customer-facing gross amounts; destination VAT is extracted where applicable.

create type public.shipping_calculation_type as enum ('FLAT', 'BASE_PLUS_ADDITIONAL', 'PER_ITEM');
create type public.shipping_threshold_basis as enum ('BEFORE_DISCOUNT', 'AFTER_DISCOUNT');
create type public.eu_vat_mode as enum ('SWEDISH_ORIGIN', 'DESTINATION');
create type public.discount_kind as enum ('PERCENTAGE', 'FIXED_AMOUNT');
create type public.discount_redemption_status as enum ('RESERVED', 'REDEEMED', 'RELEASED');

create table public.tax_settings (
  id boolean primary key default true check (id),
  eu_mode public.eu_vat_mode not null default 'DESTINATION',
  catalogue_prices_include_vat boolean not null default true,
  export_rate_basis_points integer not null default 0 check (export_rate_basis_points between 0 and 10000),
  export_message text not null default 'No Swedish or EU VAT is charged. Import VAT, tax or duties may be charged by the destination country.',
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.tax_categories (
  key text primary key check (key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  tax_category_key text not null references public.tax_categories(key) on update cascade on delete restrict,
  rate_basis_points integer not null check (rate_basis_points between 0 and 10000),
  valid_from date not null,
  valid_to date check (valid_to is null or valid_to >= valid_from),
  enabled boolean not null default true,
  source text not null default '' check (char_length(source) <= 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, tax_category_key, valid_from)
);
create index tax_rules_lookup on public.tax_rules(country_code, tax_category_key, enabled, valid_from desc);

insert into public.tax_settings(id, eu_mode, catalogue_prices_include_vat)
values (true, 'DESTINATION', true);
insert into public.tax_categories(key, name) values ('standard_goods', 'Standard goods');

-- Current standard rates from the European Commission table, checked 2026-09-09.
-- reviewed_at remains null until the shop owner/accountant confirms the configuration.
insert into public.tax_rules(country_code, tax_category_key, rate_basis_points, valid_from, source) values
  ('AT','standard_goods',2000,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('BE','standard_goods',2100,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('HR','standard_goods',2500,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('CZ','standard_goods',2100,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('DK','standard_goods',2500,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('FI','standard_goods',2550,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('FR','standard_goods',2000,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('DE','standard_goods',1900,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('GR','standard_goods',2400,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('HU','standard_goods',2700,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('IE','standard_goods',2300,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('IT','standard_goods',2200,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('LU','standard_goods',1700,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('MC','standard_goods',2000,'2026-01-01','Monaco is treated as France for EU VAT purposes'),
  ('NL','standard_goods',2100,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('PL','standard_goods',2300,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('PT','standard_goods',2300,'2026-01-01','European Commission / Your Europe mainland standard VAT rate'),
  ('SK','standard_goods',2300,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('SI','standard_goods',2200,'2026-01-01','European Commission / Your Europe standard VAT rate'),
  ('ES','standard_goods',2100,'2026-01-01','European Commission / Your Europe mainland standard VAT rate'),
  ('SE','standard_goods',2500,'2026-01-01','European Commission / Your Europe standard VAT rate');

update public.products set tax_category_key = 'standard_goods' where tax_category_key is null;
alter table public.products alter column tax_category_key set default 'standard_goods';
alter table public.products add constraint products_tax_category_fk
  foreign key (tax_category_key) references public.tax_categories(key) on update cascade on delete restrict;

create table public.shipping_settings (
  id boolean primary key default true check (id),
  packaging_weight_grams integer not null default 0 check (packaging_weight_grams >= 0),
  updated_at timestamptz not null default now()
);
insert into public.shipping_settings(id) values (true);

create table public.shipping_package_classes (
  key text primary key check (key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.shipping_package_classes(key, name) values ('standard', 'Standard');
alter table public.products add column shipping_class_key text not null default 'standard'
  references public.shipping_package_classes(key) on update cascade on delete restrict;

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_zone_countries (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  zone_id uuid not null references public.shipping_zones(id) on delete cascade
);
create index shipping_zone_countries_zone on public.shipping_zone_countries(zone_id);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  carrier text,
  tracked boolean not null default true,
  estimated_delivery text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipping_methods_zone on public.shipping_methods(zone_id, active, sort_order);

create table public.shipping_rate_rules (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.shipping_methods(id) on delete cascade,
  calculation_type public.shipping_calculation_type not null default 'BASE_PLUS_ADDITIONAL',
  base_amount integer not null default 0 check (base_amount >= 0),
  additional_item_amount integer not null default 0 check (additional_item_amount >= 0),
  min_weight_grams integer not null default 0 check (min_weight_grams >= 0),
  max_weight_grams integer check (max_weight_grams is null or max_weight_grams >= min_weight_grams),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  max_subtotal integer check (max_subtotal is null or max_subtotal >= min_subtotal),
  package_class_key text references public.shipping_package_classes(key) on update cascade on delete restrict,
  free_shipping_threshold integer check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  threshold_basis public.shipping_threshold_basis not null default 'AFTER_DISCOUNT',
  price_includes_vat boolean not null default false,
  shipping_tax_category_key text not null default 'standard_goods'
    references public.tax_categories(key) on update cascade on delete restrict,
  active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipping_rate_rules_method on public.shipping_rate_rules(method_id, active, priority, id);

insert into public.shipping_zones(id,key,name,sort_order) values
  ('20000000-0000-4000-8000-000000000001','sweden','Sweden',0),
  ('20000000-0000-4000-8000-000000000002','united_states','United States',1),
  ('20000000-0000-4000-8000-000000000003','eu_vat','EU VAT zone',2),
  ('20000000-0000-4000-8000-000000000004','other_non_eu','Other non-EU',3);

insert into public.shipping_zone_countries(country_code,zone_id) values
  ('SE','20000000-0000-4000-8000-000000000001'),
  ('US','20000000-0000-4000-8000-000000000002'),
  ('AT','20000000-0000-4000-8000-000000000003'),('BE','20000000-0000-4000-8000-000000000003'),
  ('HR','20000000-0000-4000-8000-000000000003'),('CZ','20000000-0000-4000-8000-000000000003'),
  ('DK','20000000-0000-4000-8000-000000000003'),('FI','20000000-0000-4000-8000-000000000003'),
  ('FR','20000000-0000-4000-8000-000000000003'),('DE','20000000-0000-4000-8000-000000000003'),
  ('GR','20000000-0000-4000-8000-000000000003'),('HU','20000000-0000-4000-8000-000000000003'),
  ('IE','20000000-0000-4000-8000-000000000003'),('IT','20000000-0000-4000-8000-000000000003'),
  ('LU','20000000-0000-4000-8000-000000000003'),('MC','20000000-0000-4000-8000-000000000003'),
  ('NL','20000000-0000-4000-8000-000000000003'),('PL','20000000-0000-4000-8000-000000000003'),
  ('PT','20000000-0000-4000-8000-000000000003'),('SK','20000000-0000-4000-8000-000000000003'),
  ('SI','20000000-0000-4000-8000-000000000003'),('ES','20000000-0000-4000-8000-000000000003'),
  ('AU','20000000-0000-4000-8000-000000000004'),('CA','20000000-0000-4000-8000-000000000004'),
  ('GL','20000000-0000-4000-8000-000000000004'),('IS','20000000-0000-4000-8000-000000000004'),
  ('JP','20000000-0000-4000-8000-000000000004'),('LI','20000000-0000-4000-8000-000000000004'),
  ('NZ','20000000-0000-4000-8000-000000000004'),('NO','20000000-0000-4000-8000-000000000004'),
  ('KR','20000000-0000-4000-8000-000000000004'),('CH','20000000-0000-4000-8000-000000000004'),
  ('AX','20000000-0000-4000-8000-000000000004');

insert into public.shipping_methods(id,zone_id,name,tracked,estimated_delivery,sort_order) values
  ('21000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Tracked delivery',true,'Estimated delivery shown at checkout',0),
  ('21000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Tracked international delivery',true,'Estimated delivery shown at checkout',0),
  ('21000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Tracked EU delivery',true,'Estimated delivery shown at checkout',0),
  ('21000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','Tracked international delivery',true,'Estimated delivery shown at checkout',0);

insert into public.shipping_rate_rules(
  id,method_id,calculation_type,base_amount,additional_item_amount,price_includes_vat,priority
) values
  ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','BASE_PLUS_ADDITIONAL',8000,0,true,0),
  ('22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000002','BASE_PLUS_ADDITIONAL',25000,0,false,0),
  ('22000000-0000-4000-8000-000000000003','21000000-0000-4000-8000-000000000003','BASE_PLUS_ADDITIONAL',25000,0,true,0),
  ('22000000-0000-4000-8000-000000000004','21000000-0000-4000-8000-000000000004','BASE_PLUS_ADDITIONAL',25000,0,false,0);

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  name text not null check (char_length(name) between 1 and 120),
  kind public.discount_kind not null,
  percentage_basis_points integer check (percentage_basis_points between 1 and 10000),
  fixed_amount integer check (fixed_amount > 0),
  minimum_subtotal integer not null default 0 check (minimum_subtotal >= 0),
  starts_at timestamptz,
  ends_at timestamptz check (ends_at is null or starts_at is null or ends_at > starts_at),
  active boolean not null default false,
  total_usage_limit integer check (total_usage_limit is null or total_usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'PERCENTAGE' and percentage_basis_points is not null and fixed_amount is null) or
         (kind = 'FIXED_AMOUNT' and fixed_amount is not null and percentage_basis_points is null))
);

create table public.discount_products (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (discount_id, product_id)
);
create table public.discount_collections (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (discount_id, collection_id)
);
create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete restrict,
  redemption_key uuid not null unique,
  email_identity_hash text not null check (email_identity_hash ~ '^[0-9a-f]{64}$'),
  phone_identity_hash text not null check (phone_identity_hash ~ '^[0-9a-f]{64}$'),
  status public.discount_redemption_status not null default 'RESERVED',
  amount integer not null check (amount >= 0),
  currency text not null check (currency in ('SEK','EUR','USD')),
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index discount_redemptions_lookup on public.discount_redemptions(discount_id,status);
create index discount_redemptions_email on public.discount_redemptions(discount_id,email_identity_hash) where status in ('RESERVED','REDEEMED');
create index discount_redemptions_phone on public.discount_redemptions(discount_id,phone_identity_hash) where status in ('RESERVED','REDEEMED');

insert into public.discounts(
  id,code,name,kind,percentage_basis_points,active,per_customer_limit
) values (
  '23000000-0000-4000-8000-000000000001','MACMAER10','Macmaer 10%','PERCENTAGE',1000,true,1
);

alter table public.carts add column discount_code text references public.discounts(code) on update cascade on delete set null;

create trigger tax_settings_updated_at before update on public.tax_settings for each row execute function public.set_updated_at();
create trigger tax_categories_updated_at before update on public.tax_categories for each row execute function public.set_updated_at();
create trigger tax_rules_updated_at before update on public.tax_rules for each row execute function public.set_updated_at();
create trigger shipping_settings_updated_at before update on public.shipping_settings for each row execute function public.set_updated_at();
create trigger shipping_classes_updated_at before update on public.shipping_package_classes for each row execute function public.set_updated_at();
create trigger shipping_zones_updated_at before update on public.shipping_zones for each row execute function public.set_updated_at();
create trigger shipping_methods_updated_at before update on public.shipping_methods for each row execute function public.set_updated_at();
create trigger shipping_rules_updated_at before update on public.shipping_rate_rules for each row execute function public.set_updated_at();
create trigger discounts_updated_at before update on public.discounts for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array[
    'tax_settings','tax_categories','tax_rules','shipping_settings','shipping_package_classes',
    'shipping_zones','shipping_zone_countries','shipping_methods','shipping_rate_rules',
    'discounts','discount_products','discount_collections','discount_redemptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  foreach t in array array[
    'tax_settings','tax_categories','tax_rules','shipping_settings','shipping_package_classes',
    'shipping_zones','shipping_zone_countries','shipping_methods','shipping_rate_rules',
    'discounts','discount_products','discount_collections'
  ] loop
    execute format('grant select,insert,update,delete on public.%I to authenticated', t);
    execute format('create policy admin_manage on public.%I to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end; $$;
grant select on public.discount_redemptions to authenticated;
create policy admin_read_redemptions on public.discount_redemptions for select to authenticated using ((select public.is_admin()));

create trigger tax_settings_audit after update on public.tax_settings for each row execute function private.audit_change();
create trigger shipping_zones_audit after insert or update on public.shipping_zones for each row execute function private.audit_change();
create trigger discounts_audit after insert or update on public.discounts for each row execute function private.audit_change();

create function public.admin_save_shipping_settings(document jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare c jsonb; z jsonb; m jsonb; r jsonb; pc jsonb;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtextextended('shipping-settings',0));
  if jsonb_typeof(document->'zones') <> 'array' or jsonb_array_length(document->'zones') = 0
     or jsonb_typeof(document->'countries') <> 'array'
     or jsonb_typeof(document->'package_classes') <> 'array' then
    raise exception 'Invalid shipping settings' using errcode='22023';
  end if;
  update public.shipping_settings set
    packaging_weight_grams=(document->>'packaging_weight_grams')::integer
  where id=true;
  for pc in select * from jsonb_array_elements(document->'package_classes') loop
    insert into public.shipping_package_classes(key,name,active)
    values(pc->>'key',pc->>'name',(pc->>'active')::boolean)
    on conflict(key) do update set name=excluded.name,active=excluded.active;
  end loop;
  -- Keep an explicit predicate for hosted Supabase's pg-safeupdate guard.
  delete from public.shipping_zone_countries where country_code is not null;
  for z in select * from jsonb_array_elements(document->'zones') loop
    insert into public.shipping_zones(id,key,name,active,sort_order)
    values((z->>'id')::uuid,z->>'key',z->>'name',(z->>'active')::boolean,(z->>'sort_order')::integer)
    on conflict(id) do update set key=excluded.key,name=excluded.name,active=excluded.active,sort_order=excluded.sort_order;
    for m in select * from jsonb_array_elements(z->'methods') loop
      insert into public.shipping_methods(id,zone_id,name,carrier,tracked,estimated_delivery,active,sort_order)
      values((m->>'id')::uuid,(z->>'id')::uuid,m->>'name',nullif(m->>'carrier',''),(m->>'tracked')::boolean,
        coalesce(m->>'estimated_delivery',''),(m->>'active')::boolean,(m->>'sort_order')::integer)
      on conflict(id) do update set zone_id=excluded.zone_id,name=excluded.name,carrier=excluded.carrier,
        tracked=excluded.tracked,estimated_delivery=excluded.estimated_delivery,active=excluded.active,sort_order=excluded.sort_order;
      delete from public.shipping_rate_rules where method_id=(m->>'id')::uuid
        and id not in (select (value->>'id')::uuid from jsonb_array_elements(m->'rules'));
      for r in select * from jsonb_array_elements(m->'rules') loop
        insert into public.shipping_rate_rules(
          id,method_id,calculation_type,base_amount,additional_item_amount,min_weight_grams,max_weight_grams,
          min_subtotal,max_subtotal,package_class_key,free_shipping_threshold,threshold_basis,
          price_includes_vat,shipping_tax_category_key,active,priority
        ) values (
          (r->>'id')::uuid,(m->>'id')::uuid,(r->>'calculation_type')::public.shipping_calculation_type,
          (r->>'base_amount')::integer,(r->>'additional_item_amount')::integer,
          (r->>'min_weight_grams')::integer,nullif(r->>'max_weight_grams','')::integer,
          (r->>'min_subtotal')::integer,nullif(r->>'max_subtotal','')::integer,
          nullif(r->>'package_class_key',''),nullif(r->>'free_shipping_threshold','')::integer,
          (r->>'threshold_basis')::public.shipping_threshold_basis,(r->>'price_includes_vat')::boolean,
          r->>'shipping_tax_category_key',(r->>'active')::boolean,(r->>'priority')::integer
        ) on conflict(id) do update set
          method_id=excluded.method_id,calculation_type=excluded.calculation_type,base_amount=excluded.base_amount,
          additional_item_amount=excluded.additional_item_amount,min_weight_grams=excluded.min_weight_grams,
          max_weight_grams=excluded.max_weight_grams,min_subtotal=excluded.min_subtotal,max_subtotal=excluded.max_subtotal,
          package_class_key=excluded.package_class_key,free_shipping_threshold=excluded.free_shipping_threshold,
          threshold_basis=excluded.threshold_basis,price_includes_vat=excluded.price_includes_vat,
          shipping_tax_category_key=excluded.shipping_tax_category_key,active=excluded.active,priority=excluded.priority;
      end loop;
    end loop;
    delete from public.shipping_methods where zone_id=(z->>'id')::uuid
      and id not in (select (value->>'id')::uuid from jsonb_array_elements(z->'methods'));
  end loop;
  for c in select * from jsonb_array_elements(document->'countries') loop
    insert into public.shipping_zone_countries(country_code,zone_id)
    values(c->>'country_code',(c->>'zone_id')::uuid);
  end loop;
  delete from public.shipping_zones where id not in
    (select (value->>'id')::uuid from jsonb_array_elements(document->'zones'));
end; $$;
revoke all on function public.admin_save_shipping_settings(jsonb) from public;
grant execute on function public.admin_save_shipping_settings(jsonb) to authenticated;

create function public.admin_save_tax_settings(document jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare c jsonb; r jsonb;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtextextended('tax-settings',0));
  if jsonb_typeof(document->'categories') <> 'array' or jsonb_typeof(document->'rules') <> 'array' then
    raise exception 'Invalid tax settings' using errcode='22023';
  end if;
  update public.tax_settings set
    eu_mode=(document->>'eu_mode')::public.eu_vat_mode,
    catalogue_prices_include_vat=(document->>'catalogue_prices_include_vat')::boolean,
    export_rate_basis_points=(document->>'export_rate_basis_points')::integer,
    export_message=document->>'export_message',
    reviewed_at=nullif(document->>'reviewed_at','')::timestamptz
  where id=true;
  for c in select * from jsonb_array_elements(document->'categories') loop
    insert into public.tax_categories(key,name,active)
    values(c->>'key',c->>'name',(c->>'active')::boolean)
    on conflict(key) do update set name=excluded.name,active=excluded.active;
  end loop;
  for r in select * from jsonb_array_elements(document->'rules') loop
    insert into public.tax_rules(
      id,country_code,tax_category_key,rate_basis_points,valid_from,valid_to,enabled,source,reviewed_at
    ) values (
      (r->>'id')::uuid,r->>'country_code',r->>'tax_category_key',(r->>'rate_basis_points')::integer,
      (r->>'valid_from')::date,nullif(r->>'valid_to','')::date,(r->>'enabled')::boolean,
      coalesce(r->>'source',''),nullif(r->>'reviewed_at','')::timestamptz
    ) on conflict(id) do update set
      country_code=excluded.country_code,tax_category_key=excluded.tax_category_key,
      rate_basis_points=excluded.rate_basis_points,valid_from=excluded.valid_from,valid_to=excluded.valid_to,
      enabled=excluded.enabled,source=excluded.source,reviewed_at=excluded.reviewed_at;
  end loop;
end; $$;
revoke all on function public.admin_save_tax_settings(jsonb) from public;
grant execute on function public.admin_save_tax_settings(jsonb) to authenticated;

create function public.admin_save_discounts(document jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare d jsonb; pid text; cid text;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtextextended('discount-settings',0));
  if jsonb_typeof(document) <> 'array' then raise exception 'Invalid discounts' using errcode='22023'; end if;
  for d in select * from jsonb_array_elements(document) loop
    insert into public.discounts(
      id,code,name,kind,percentage_basis_points,fixed_amount,minimum_subtotal,starts_at,ends_at,
      active,total_usage_limit,per_customer_limit
    ) values (
      (d->>'id')::uuid,upper(d->>'code'),d->>'name',(d->>'kind')::public.discount_kind,
      nullif(d->>'percentage_basis_points','')::integer,nullif(d->>'fixed_amount','')::integer,
      (d->>'minimum_subtotal')::integer,nullif(d->>'starts_at','')::timestamptz,
      nullif(d->>'ends_at','')::timestamptz,(d->>'active')::boolean,
      nullif(d->>'total_usage_limit','')::integer,nullif(d->>'per_customer_limit','')::integer
    ) on conflict(id) do update set
      code=excluded.code,name=excluded.name,kind=excluded.kind,
      percentage_basis_points=excluded.percentage_basis_points,fixed_amount=excluded.fixed_amount,
      minimum_subtotal=excluded.minimum_subtotal,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
      active=excluded.active,total_usage_limit=excluded.total_usage_limit,per_customer_limit=excluded.per_customer_limit;
    delete from public.discount_products where discount_id=(d->>'id')::uuid;
    for pid in select * from jsonb_array_elements_text(d->'product_ids') loop
      insert into public.discount_products(discount_id,product_id) values((d->>'id')::uuid,pid::uuid);
    end loop;
    delete from public.discount_collections where discount_id=(d->>'id')::uuid;
    for cid in select * from jsonb_array_elements_text(d->'collection_ids') loop
      insert into public.discount_collections(discount_id,collection_id) values((d->>'id')::uuid,cid::uuid);
    end loop;
  end loop;
end; $$;
revoke all on function public.admin_save_discounts(jsonb) from public;
grant execute on function public.admin_save_discounts(jsonb) to authenticated;
