-- Phase 5: immutable checkout orders, Stripe payment reconciliation, and policy versions.

-- Confirmed business rule: Sweden alone receives free shipping when the
-- after-discount merchandise subtotal is at least 500 SEK.
update public.shipping_rate_rules
set free_shipping_threshold = 50000,
    threshold_basis = 'AFTER_DISCOUNT'
where id = '22000000-0000-4000-8000-000000000001';

create type public.order_status as enum (
  'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED',
  'DELIVERED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'
);
create type public.payment_status as enum (
  'NOT_STARTED', 'REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED',
  'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED'
);
create type public.inventory_reservation_status as enum ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');
create type public.policy_type as enum ('TERMS', 'PRIVACY', 'SHIPPING', 'RETURNS', 'CUSTOMS');

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_type public.policy_type not null,
  version text not null check (char_length(version) between 1 and 80),
  effective_at timestamptz,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  source_reference text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (policy_type, version)
);

-- These records deliberately remain drafts until the owner fills the business
-- identity placeholders and obtains the requested pre-launch review.
insert into public.policy_versions(id, policy_type, version, content_hash, source_reference) values
  ('30000000-0000-4000-8000-000000000001', 'TERMS', '2026-09-10-draft', '10c06960e6135d1831d106781cfe875cf7867638334b841e580754fa117cb2c7', 'macmaer_legal_checkout_policies.md#1'),
  ('30000000-0000-4000-8000-000000000002', 'PRIVACY', '2026-09-10-draft', '10c06960e6135d1831d106781cfe875cf7867638334b841e580754fa117cb2c7', 'macmaer_legal_checkout_policies.md#2'),
  ('30000000-0000-4000-8000-000000000003', 'SHIPPING', '2026-09-10-draft', '10c06960e6135d1831d106781cfe875cf7867638334b841e580754fa117cb2c7', 'macmaer_legal_checkout_policies.md#3'),
  ('30000000-0000-4000-8000-000000000004', 'RETURNS', '2026-09-10-draft', '10c06960e6135d1831d106781cfe875cf7867638334b841e580754fa117cb2c7', 'macmaer_legal_checkout_policies.md#4'),
  ('30000000-0000-4000-8000-000000000005', 'CUSTOMS', '2026-09-10-draft', '10c06960e6135d1831d106781cfe875cf7867638334b841e580754fa117cb2c7', 'macmaer_legal_checkout_policies.md#5');

create table public.order_number_counters (
  year integer primary key check (year between 2020 and 9999),
  next_number integer not null check (next_number > 0)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^MAC-[0-9]{4}-[0-9]{6}$'),
  checkout_attempt_id uuid not null unique,
  access_token_hash text not null check (access_token_hash ~ '^[0-9a-f]{64}$'),
  cart_id uuid references public.carts(id) on delete set null,
  status public.order_status not null default 'PENDING_PAYMENT',
  payment_status public.payment_status not null default 'NOT_STARTED',
  currency text not null check (currency in ('SEK','EUR','USD')),
  customer_name text not null check (char_length(customer_name) between 1 and 160),
  customer_email text not null check (char_length(customer_email) between 3 and 320),
  customer_phone text not null check (char_length(customer_phone) between 3 and 40),
  email_identity_hash text not null check (email_identity_hash ~ '^[0-9a-f]{64}$'),
  phone_identity_hash text not null check (phone_identity_hash ~ '^[0-9a-f]{64}$'),
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  billing_address jsonb not null check (jsonb_typeof(billing_address) = 'object'),
  destination_country text not null check (destination_country ~ '^[A-Z]{2}$'),
  shipping_method_snapshot jsonb not null check (jsonb_typeof(shipping_method_snapshot) = 'object'),
  policy_version_ids jsonb not null check (jsonb_typeof(policy_version_ids) = 'object'),
  merchandise_amount bigint not null check (merchandise_amount >= 0),
  discount_amount bigint not null check (discount_amount >= 0),
  merchandise_net_amount bigint not null check (merchandise_net_amount >= 0),
  merchandise_tax_amount bigint not null check (merchandise_tax_amount >= 0),
  shipping_net_amount bigint not null check (shipping_net_amount >= 0),
  shipping_tax_amount bigint not null check (shipping_tax_amount >= 0),
  shipping_gross_amount bigint not null check (shipping_gross_amount >= 0),
  net_amount bigint not null check (net_amount >= 0),
  tax_amount bigint not null check (tax_amount >= 0),
  total_amount bigint not null check (total_amount > 0),
  discount_id uuid references public.discounts(id) on delete restrict,
  discount_code text,
  discount_name text,
  fx_rate_id uuid references public.currency_rates(id) on delete restrict,
  tax_rule_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(tax_rule_ids) = 'array'),
  tax_rates_basis_points jsonb not null default '[]'::jsonb check (jsonb_typeof(tax_rates_basis_points) = 'array'),
  tax_message text not null default '',
  terms_accepted_at timestamptz not null,
  reservation_expires_at timestamptz not null,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= merchandise_amount),
  check (net_amount + tax_amount = total_amount),
  check (merchandise_net_amount + merchandise_tax_amount + shipping_net_amount + shipping_tax_amount = total_amount),
  check ((discount_id is null and discount_code is null and discount_name is null) or
         (discount_id is not null and discount_code is not null and discount_name is not null))
);
create unique index one_open_order_per_cart on public.orders(cart_id)
where cart_id is not null and status <> 'CANCELLED';
create index orders_created on public.orders(created_at desc, id);
create index orders_email_identity on public.orders(email_identity_hash, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  cart_line_id uuid,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_title text not null,
  product_slug text not null,
  sku text,
  image_path text,
  selected_options jsonb not null check (jsonb_typeof(selected_options) = 'array'),
  quantity integer not null check (quantity between 1 and 99),
  unit_amount bigint not null check (unit_amount >= 0),
  gross_amount bigint not null check (gross_amount >= 0),
  discount_amount bigint not null check (discount_amount >= 0),
  net_amount bigint not null check (net_amount >= 0),
  tax_amount bigint not null check (tax_amount >= 0),
  tax_rate_basis_points integer not null check (tax_rate_basis_points between 0 and 10000),
  tax_rule_id uuid references public.tax_rules(id) on delete restrict,
  tax_line text,
  created_at timestamptz not null default now(),
  check (discount_amount <= gross_amount),
  check (net_amount + tax_amount = gross_amount - discount_amount)
);
create index order_items_order on public.order_items(order_id, created_at, id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  provider text not null default 'STRIPE' check (provider = 'STRIPE'),
  stripe_payment_intent_id text unique,
  status public.payment_status not null default 'NOT_STARTED',
  amount bigint not null check (amount > 0),
  currency text not null check (currency in ('SEK','EUR','USD')),
  last_provider_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null unique references public.order_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status public.inventory_reservation_status not null default 'ACTIVE',
  expires_at timestamptz not null,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index inventory_reservations_active_product on public.inventory_reservations(product_id, variant_id, expires_at)
where status = 'ACTIVE';

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 1 and 100),
  source text not null check (source in ('CHECKOUT','STRIPE','ADMIN','SYSTEM')),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);
create index order_events_order on public.order_events(order_id, created_at, id);

create table public.processed_webhook_events (
  event_id text primary key,
  event_type text not null,
  object_id text,
  order_id uuid references public.orders(id) on delete set null,
  result text not null,
  processed_at timestamptz not null default now()
);

alter table public.carts add column converted_at timestamptz;

create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array[
    'policy_versions','order_number_counters','orders','order_items','payments',
    'inventory_reservations','order_events','processed_webhook_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  foreach t in array array[
    'policy_versions','orders','order_items','payments','inventory_reservations',
    'order_events','processed_webhook_events'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))', t);
  end loop;
end; $$;

create function public.checkout_create_order(document jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  existing_id uuid;
  new_order_id uuid := gen_random_uuid();
  generated_number integer;
  generated_year integer := extract(year from now())::integer;
  line jsonb;
  item_id uuid;
  inventory_row record;
  discount_row record;
  active_count integer;
begin
  if jsonb_typeof(document) <> 'object' or jsonb_typeof(document->'items') <> 'array'
     or jsonb_array_length(document->'items') = 0 then
    raise exception 'Invalid checkout document' using errcode = '22023';
  end if;

  select id into existing_id from public.orders
  where checkout_attempt_id = (document->>'checkout_attempt_id')::uuid;
  if existing_id is not null then return existing_id; end if;

  perform pg_advisory_xact_lock(hashtextextended(document->>'cart_id', 0));
  select id into existing_id from public.orders
  where checkout_attempt_id = (document->>'checkout_attempt_id')::uuid;
  if existing_id is not null then return existing_id; end if;

  if nullif(document->>'discount_id','') is not null then
    select * into discount_row from public.discounts
    where id = (document->>'discount_id')::uuid for update;
    if discount_row.id is null or not discount_row.active
       or (discount_row.starts_at is not null and discount_row.starts_at > now())
       or (discount_row.ends_at is not null and discount_row.ends_at <= now()) then
      raise exception 'Discount is no longer available' using errcode = '23514';
    end if;
    select count(*) into active_count from public.discount_redemptions
    where discount_id = discount_row.id
      and status in ('RESERVED','REDEEMED');
    if discount_row.total_usage_limit is not null and active_count >= discount_row.total_usage_limit then
      raise exception 'Discount usage limit reached' using errcode = '23514';
    end if;
    select count(*) into active_count from public.discount_redemptions
    where discount_id = discount_row.id
      and status in ('RESERVED','REDEEMED')
      and (email_identity_hash = document->>'email_identity_hash'
           or phone_identity_hash = document->>'phone_identity_hash');
    if discount_row.per_customer_limit is not null and active_count >= discount_row.per_customer_limit then
      raise exception 'Discount was already used by this customer' using errcode = '23514';
    end if;
  end if;

  insert into public.order_number_counters(year, next_number)
  values (generated_year, 2)
  on conflict (year) do update set next_number = public.order_number_counters.next_number + 1
  returning next_number - 1 into generated_number;

  insert into public.orders(
    id, order_number, checkout_attempt_id, access_token_hash, cart_id, currency,
    customer_name, customer_email, customer_phone, email_identity_hash, phone_identity_hash,
    shipping_address, billing_address, destination_country, shipping_method_snapshot, policy_version_ids,
    merchandise_amount, discount_amount, merchandise_net_amount, merchandise_tax_amount,
    shipping_net_amount, shipping_tax_amount, shipping_gross_amount, net_amount, tax_amount, total_amount,
    discount_id, discount_code, discount_name, fx_rate_id, tax_rule_ids, tax_rates_basis_points,
    tax_message, terms_accepted_at, reservation_expires_at
  ) values (
    new_order_id, format('MAC-%s-%s', generated_year, lpad(generated_number::text, 6, '0')),
    (document->>'checkout_attempt_id')::uuid, document->>'access_token_hash', (document->>'cart_id')::uuid,
    document->>'currency', document->>'customer_name', document->>'customer_email', document->>'customer_phone',
    document->>'email_identity_hash', document->>'phone_identity_hash', document->'shipping_address',
    document->'billing_address', document->>'destination_country', document->'shipping_method_snapshot',
    document->'policy_version_ids', (document->>'merchandise_amount')::bigint,
    (document->>'discount_amount')::bigint, (document->>'merchandise_net_amount')::bigint,
    (document->>'merchandise_tax_amount')::bigint, (document->>'shipping_net_amount')::bigint,
    (document->>'shipping_tax_amount')::bigint, (document->>'shipping_gross_amount')::bigint,
    (document->>'net_amount')::bigint, (document->>'tax_amount')::bigint, (document->>'total_amount')::bigint,
    nullif(document->>'discount_id','')::uuid, nullif(document->>'discount_code',''),
    nullif(document->>'discount_name',''), nullif(document->>'fx_rate_id','')::uuid,
    document->'tax_rule_ids', document->'tax_rates_basis_points', document->>'tax_message',
    (document->>'terms_accepted_at')::timestamptz, (document->>'reservation_expires_at')::timestamptz
  );

  for line in select * from jsonb_array_elements(document->'items') loop
    insert into public.order_items(
      order_id, cart_line_id, product_id, variant_id, product_title, product_slug, sku, image_path,
      selected_options, quantity, unit_amount, gross_amount, discount_amount, net_amount,
      tax_amount, tax_rate_basis_points, tax_rule_id, tax_line
    ) values (
      new_order_id, nullif(line->>'cart_line_id','')::uuid, (line->>'product_id')::uuid,
      nullif(line->>'variant_id','')::uuid, line->>'product_title', line->>'product_slug',
      nullif(line->>'sku',''), nullif(line->>'image_path',''), line->'selected_options',
      (line->>'quantity')::integer, (line->>'unit_amount')::bigint, (line->>'gross_amount')::bigint,
      (line->>'discount_amount')::bigint, (line->>'net_amount')::bigint, (line->>'tax_amount')::bigint,
      (line->>'tax_rate_basis_points')::integer, nullif(line->>'tax_rule_id','')::uuid,
      nullif(line->>'tax_message_line','')
    ) returning id into item_id;

    if nullif(line->>'variant_id','') is not null then
      select inventory_strategy, stock_quantity into inventory_row
      from public.product_variants where id = (line->>'variant_id')::uuid for update;
    else
      select inventory_strategy, stock_quantity into inventory_row
      from public.products where id = (line->>'product_id')::uuid for update;
    end if;
    if inventory_row.inventory_strategy = 'TRACKED' then
      select coalesce(sum(quantity),0)::integer into active_count
      from public.inventory_reservations
      where product_id = (line->>'product_id')::uuid
        and variant_id is not distinct from nullif(line->>'variant_id','')::uuid
        and status = 'ACTIVE';
      if inventory_row.stock_quantity - active_count < (line->>'quantity')::integer then
        raise exception 'Insufficient inventory for checkout' using errcode = '23514';
      end if;
      insert into public.inventory_reservations(
        order_id, order_item_id, product_id, variant_id, quantity, expires_at
      ) values (
        new_order_id, item_id, (line->>'product_id')::uuid, nullif(line->>'variant_id','')::uuid,
        (line->>'quantity')::integer, (document->>'reservation_expires_at')::timestamptz
      );
    end if;
  end loop;

  if (select coalesce(sum(gross_amount),0) from public.order_items where order_id = new_order_id)
       <> (document->>'merchandise_amount')::bigint
     or (select coalesce(sum(discount_amount),0) from public.order_items where order_id = new_order_id)
       <> (document->>'discount_amount')::bigint
     or (select coalesce(sum(net_amount),0) from public.order_items where order_id = new_order_id)
       <> (document->>'merchandise_net_amount')::bigint
     or (select coalesce(sum(tax_amount),0) from public.order_items where order_id = new_order_id)
       <> (document->>'merchandise_tax_amount')::bigint then
    raise exception 'Order item totals do not reconcile' using errcode = '23514';
  end if;

  insert into public.payments(order_id, amount, currency)
  values(new_order_id, (document->>'total_amount')::bigint, document->>'currency');

  if nullif(document->>'discount_id','') is not null then
    insert into public.discount_redemptions(
      discount_id, redemption_key, email_identity_hash, phone_identity_hash,
      status, amount, currency, expires_at
    ) values (
      discount_row.id, new_order_id, document->>'email_identity_hash', document->>'phone_identity_hash',
      'RESERVED', (document->>'discount_amount')::integer, document->>'currency',
      (document->>'reservation_expires_at')::timestamptz
    );
  end if;

  insert into public.order_events(order_id, event_type, source)
  values(new_order_id, 'ORDER_CREATED', 'CHECKOUT');
  return new_order_id;
end; $$;
revoke all on function public.checkout_create_order(jsonb) from public;
grant execute on function public.checkout_create_order(jsonb) to service_role;

create function public.checkout_set_payment_intent(target_order_id uuid, payment_intent_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.payments set
    stripe_payment_intent_id = payment_intent_id,
    status = 'REQUIRES_PAYMENT'
  where order_id = target_order_id
    and (stripe_payment_intent_id is null or stripe_payment_intent_id = payment_intent_id);
  if not found then raise exception 'Payment record not found or does not match' using errcode = '23514'; end if;
  update public.orders set payment_status = 'REQUIRES_PAYMENT' where id = target_order_id;
end; $$;
revoke all on function public.checkout_set_payment_intent(uuid,text) from public;
grant execute on function public.checkout_set_payment_intent(uuid,text) to service_role;

-- Call only after Stripe confirms that the corresponding PaymentIntent is
-- cancelled (or before a PaymentIntent was created). This ordering prevents a
-- late successful charge from outliving its inventory reservation.
create function public.checkout_cancel_order(target_order_id uuid, reason text default 'Checkout expired')
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_order_id::text, 0));
  if exists (select 1 from public.orders where id = target_order_id and payment_status = 'SUCCEEDED') then
    raise exception 'A paid order cannot be cancelled by checkout cleanup' using errcode = '23514';
  end if;
  update public.orders set status = 'CANCELLED', payment_status = 'FAILED', cancelled_at = now()
  where id = target_order_id and status = 'PENDING_PAYMENT';
  update public.payments set status = 'FAILED', last_provider_error = left(reason, 500)
  where order_id = target_order_id and status <> 'SUCCEEDED';
  update public.inventory_reservations set status = 'EXPIRED', released_at = now()
  where order_id = target_order_id and status = 'ACTIVE';
  update public.discount_redemptions set status = 'RELEASED'
  where redemption_key = target_order_id and status = 'RESERVED';
  insert into public.order_events(order_id,event_type,source,detail)
  select target_order_id,'CHECKOUT_EXPIRED','SYSTEM',jsonb_build_object('reason',reason)
  where exists (select 1 from public.orders where id = target_order_id);
end; $$;
revoke all on function public.checkout_cancel_order(uuid,text) from public;
grant execute on function public.checkout_cancel_order(uuid,text) to service_role;

create function public.checkout_process_stripe_event(
  stripe_event_id text, stripe_event_type text, stripe_object_id text, target_order_id uuid,
  provider_error text default null
) returns text language plpgsql security invoker set search_path = '' as $$
declare existing_result text; reservation record;
begin
  select result into existing_result from public.processed_webhook_events where event_id = stripe_event_id;
  if existing_result is not null then return 'DUPLICATE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_order_id::text, 0));
  select result into existing_result from public.processed_webhook_events where event_id = stripe_event_id;
  if existing_result is not null then return 'DUPLICATE'; end if;

  if not exists (select 1 from public.orders where id = target_order_id) then
    raise exception 'Order not found for Stripe event' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.payments where order_id = target_order_id
      and stripe_payment_intent_id is not null and stripe_payment_intent_id <> stripe_object_id
  ) then raise exception 'Stripe object does not match order payment' using errcode = '23514'; end if;
  update public.payments set stripe_payment_intent_id = coalesce(stripe_payment_intent_id, stripe_object_id)
  where order_id = target_order_id;

  if stripe_event_type = 'payment_intent.processing' then
    update public.payments set status = 'PROCESSING', last_provider_error = null
    where order_id = target_order_id and status <> 'SUCCEEDED';
    update public.orders set payment_status = 'PROCESSING' where id = target_order_id and payment_status <> 'SUCCEEDED';
  elsif stripe_event_type = 'payment_intent.payment_failed' then
    update public.payments set status = 'FAILED', last_provider_error = left(provider_error, 500)
    where order_id = target_order_id and status <> 'SUCCEEDED';
    update public.orders set payment_status = 'FAILED' where id = target_order_id and payment_status <> 'SUCCEEDED';
  elsif stripe_event_type = 'payment_intent.canceled' then
    update public.payments set status = 'FAILED', last_provider_error = coalesce(left(provider_error, 500), 'Payment cancelled')
    where order_id = target_order_id and status <> 'SUCCEEDED';
    update public.orders set status = 'CANCELLED', payment_status = 'FAILED', cancelled_at = now()
    where id = target_order_id and payment_status <> 'SUCCEEDED';
    update public.inventory_reservations set status = 'RELEASED', released_at = now()
    where order_id = target_order_id and status = 'ACTIVE';
    update public.discount_redemptions set status = 'RELEASED'
    where redemption_key = target_order_id and status = 'RESERVED';
  elsif stripe_event_type = 'payment_intent.succeeded' then
    if not exists (select 1 from public.orders where id = target_order_id and payment_status = 'SUCCEEDED') then
      for reservation in select * from public.inventory_reservations
        where order_id = target_order_id and status = 'ACTIVE' for update
      loop
        if reservation.variant_id is not null then
          update public.product_variants set stock_quantity = stock_quantity - reservation.quantity
          where id = reservation.variant_id and inventory_strategy = 'TRACKED'
            and stock_quantity >= reservation.quantity;
        else
          update public.products set stock_quantity = stock_quantity - reservation.quantity
          where id = reservation.product_id and inventory_strategy = 'TRACKED'
            and stock_quantity >= reservation.quantity;
        end if;
        if not found then raise exception 'Reserved stock is unavailable' using errcode = '23514'; end if;
      end loop;
      update public.inventory_reservations set status = 'COMMITTED', committed_at = now()
      where order_id = target_order_id and status = 'ACTIVE';
      update public.discount_redemptions set status = 'REDEEMED', redeemed_at = now()
      where redemption_key = target_order_id and status = 'RESERVED';
      update public.payments set status = 'SUCCEEDED', last_provider_error = null where order_id = target_order_id;
      update public.orders set status = 'PAID', payment_status = 'SUCCEEDED', paid_at = now()
      where id = target_order_id;
      update public.carts set converted_at = now()
      where id = (select cart_id from public.orders where id = target_order_id);
    end if;
  else
    insert into public.processed_webhook_events(event_id,event_type,object_id,order_id,result)
    values(stripe_event_id,stripe_event_type,stripe_object_id,target_order_id,'IGNORED');
    return 'IGNORED';
  end if;

  insert into public.order_events(order_id,event_type,source,detail)
  values(target_order_id, upper(replace(stripe_event_type,'.','_')), 'STRIPE',
    jsonb_build_object('stripe_event_id',stripe_event_id,'stripe_object_id',stripe_object_id));
  insert into public.processed_webhook_events(event_id,event_type,object_id,order_id,result)
  values(stripe_event_id,stripe_event_type,stripe_object_id,target_order_id,'PROCESSED');
  return 'PROCESSED';
end; $$;
revoke all on function public.checkout_process_stripe_event(text,text,text,uuid,text) from public;
grant execute on function public.checkout_process_stripe_event(text,text,text,uuid,text) to service_role;
