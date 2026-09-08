-- Phase 3: anonymous carts, storefront context, and append-only FX rates.
-- Product/catalogue money remains canonical SEK minor units.

create table public.store_currencies (
  code text primary key check (code in ('SEK', 'EUR', 'USD')),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  markup_basis_points integer not null default 0 check (markup_basis_points between 0 and 10000),
  rounding_increment_minor integer not null default 1 check (rounding_increment_minor between 1 and 10000),
  updated_at timestamptz not null default now()
);

insert into public.store_currencies(code, enabled, sort_order) values
  ('SEK', true, 0), ('EUR', true, 1), ('USD', true, 2);

create trigger store_currencies_updated_at before update on public.store_currencies
for each row execute function public.set_updated_at();

create table public.currency_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'SEK' check (base_currency = 'SEK'),
  quote_currency text not null check (quote_currency in ('EUR', 'USD')),
  rate_numerator bigint not null check (rate_numerator > 0),
  rate_denominator bigint not null check (rate_denominator > 0),
  source text not null check (char_length(source) between 1 and 80),
  source_effective_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  unique (base_currency, quote_currency, source, source_effective_at)
);

create index currency_rates_latest
  on public.currency_rates(base_currency, quote_currency, source_effective_at desc, fetched_at desc);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  currency text not null default 'SEK' check (currency in ('SEK', 'EUR', 'USD')),
  destination_country text not null default 'SE' check (destination_country ~ '^[A-Z]{2}$'),
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger carts_updated_at before update on public.carts
for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  line_key text not null check (line_key ~ '^[0-9a-f]{64}$'),
  selected_options jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_options) = 'array'),
  product_title text not null,
  product_slug text not null,
  sku text,
  image_path text,
  quantity integer not null check (quantity between 1 and 99),
  base_unit_amount bigint not null check (base_unit_amount >= 0),
  display_unit_amount bigint not null check (display_unit_amount >= 0),
  display_currency text not null check (display_currency in ('SEK', 'EUR', 'USD')),
  fx_rate_id uuid references public.currency_rates(id) on delete restrict,
  priced_at timestamptz not null default now(),
  is_valid boolean not null default true,
  validation_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, line_key),
  check ((display_currency = 'SEK' and fx_rate_id is null) or
         (display_currency <> 'SEK' and fx_rate_id is not null)),
  check (is_valid or validation_message is not null)
);

create trigger cart_items_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();
create index cart_items_cart on public.cart_items(cart_id, created_at, id);
create index carts_expiry on public.carts(expires_at);

alter table public.store_currencies enable row level security;
alter table public.currency_rates enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

revoke all on public.store_currencies, public.currency_rates, public.carts, public.cart_items
  from anon, authenticated;

grant select, update on public.store_currencies to authenticated;
grant select, insert on public.currency_rates to authenticated;
create policy admin_currency_settings on public.store_currencies to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_currency_rates_read on public.currency_rates for select to authenticated
  using ((select public.is_admin()));
create policy admin_currency_rates_insert on public.currency_rates for insert to authenticated
  with check ((select public.is_admin()));

grant all on public.store_currencies, public.currency_rates, public.carts, public.cart_items
  to service_role;

create function public.admin_save_currency_settings(document jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.require_admin();
  if jsonb_typeof(document) <> 'array' or jsonb_array_length(document) <> 3 then
    raise exception 'All currency settings are required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from jsonb_to_recordset(document) as x(code text, enabled boolean)
    where x.code = 'SEK' and x.enabled
  ) then raise exception 'SEK must remain enabled' using errcode = '23514'; end if;
  if exists (
    select 1 from jsonb_to_recordset(document) as x(
      code text, enabled boolean, markup_basis_points integer, rounding_increment_minor integer
    ) where x.code not in ('SEK','EUR','USD')
       or x.markup_basis_points not between 0 and 10000
       or x.rounding_increment_minor not between 1 and 10000
  ) then raise exception 'Invalid currency settings' using errcode = '23514'; end if;
  if (select count(distinct x.code) from jsonb_to_recordset(document) as x(code text)) <> 3 then
    raise exception 'Each currency must occur once' using errcode = '23514';
  end if;

  update public.store_currencies c set
    enabled = x.enabled,
    markup_basis_points = x.markup_basis_points,
    rounding_increment_minor = x.rounding_increment_minor
  from jsonb_to_recordset(document) as x(
    code text, enabled boolean, markup_basis_points integer, rounding_increment_minor integer
  ) where c.code = x.code;
end; $$;
revoke all on function public.admin_save_currency_settings(jsonb) from public;
grant execute on function public.admin_save_currency_settings(jsonb) to authenticated;
