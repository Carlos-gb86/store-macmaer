-- Phase 6: order operations, fulfilment, refunds, and transactional email history.

create type public.fulfilment_status as enum (
  'UNFULFILLED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'
);
create type public.refund_status as enum ('REQUESTED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
create type public.email_delivery_status as enum ('PENDING', 'SENT', 'FAILED');
create type public.email_kind as enum (
  'ORDER_CONFIRMATION', 'ADMIN_NEW_ORDER', 'SHIPPING_CONFIRMATION',
  'REFUND_CONFIRMATION', 'CONTACT_NOTIFICATION', 'CONTACT_ACKNOWLEDGEMENT'
);

alter table public.orders
  add column fulfilment_status public.fulfilment_status not null default 'UNFULFILLED';

update public.orders set fulfilment_status = case status
  when 'PROCESSING' then 'PROCESSING'::public.fulfilment_status
  when 'READY_TO_SHIP' then 'READY_TO_SHIP'::public.fulfilment_status
  when 'SHIPPED' then 'SHIPPED'::public.fulfilment_status
  when 'DELIVERED' then 'DELIVERED'::public.fulfilment_status
  when 'CANCELLED' then 'CANCELLED'::public.fulfilment_status
  else 'UNFULFILLED'::public.fulfilment_status
end;

create table public.order_fulfilments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  carrier text check (carrier is null or carrier in ('POSTNORD', 'UPS')),
  tracking_number text check (tracking_number is null or char_length(tracking_number) between 1 and 200),
  tracking_url text check (
    tracking_url is null or
    (char_length(tracking_url) between 1 and 1000 and tracking_url ~ '^https?://')
  ),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_internal_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  author_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index order_internal_notes_order on public.order_internal_notes(order_id, created_at desc, id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  stripe_refund_id text unique,
  amount bigint not null check (amount > 0),
  currency text not null check (currency in ('SEK', 'EUR', 'USD')),
  reason text not null check (reason in ('REQUESTED_BY_CUSTOMER', 'DUPLICATE', 'FRAUDULENT', 'OTHER')),
  note text check (note is null or char_length(note) <= 1000),
  status public.refund_status not null default 'REQUESTED',
  provider_status text,
  provider_failure_reason text,
  requested_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_order on public.refunds(order_id, created_at desc, id);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  contact_message_id uuid references public.contact_messages(id) on delete restrict,
  kind public.email_kind not null,
  recipient_email text not null check (char_length(recipient_email) between 3 and 320),
  provider text not null default 'RESEND' check (provider = 'RESEND'),
  provider_message_id text,
  status public.email_delivery_status not null default 'PENDING',
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 256),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_id is not null or contact_message_id is not null)
);
create index email_deliveries_order on public.email_deliveries(order_id, created_at desc, id);
create index email_deliveries_contact on public.email_deliveries(contact_message_id, created_at desc, id);

create trigger order_fulfilments_updated_at before update on public.order_fulfilments
for each row execute function public.set_updated_at();
create trigger refunds_updated_at before update on public.refunds
for each row execute function public.set_updated_at();
create trigger email_deliveries_updated_at before update on public.email_deliveries
for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['order_fulfilments','order_internal_notes','refunds','email_deliveries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))', t);
  end loop;
end; $$;

create function public.admin_set_fulfilment(
  target_order_id uuid,
  new_status public.fulfilment_status,
  selected_carrier text default null,
  selected_tracking_number text default null,
  selected_tracking_url text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare current_order public.orders; previous_status public.fulfilment_status;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtextextended(target_order_id::text, 0));
  select * into current_order from public.orders where id = target_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  previous_status := current_order.fulfilment_status;
  if current_order.payment_status not in ('SUCCEEDED', 'PARTIALLY_REFUNDED') then
    raise exception 'Only paid orders can be fulfilled' using errcode = '23514';
  end if;
  if new_status = previous_status then return; end if;
  if not (
    (previous_status = 'UNFULFILLED' and new_status = 'PROCESSING') or
    (previous_status = 'PROCESSING' and new_status = 'READY_TO_SHIP') or
    (previous_status = 'READY_TO_SHIP' and new_status = 'SHIPPED') or
    (previous_status = 'SHIPPED' and new_status = 'DELIVERED')
  ) then raise exception 'Invalid fulfilment transition' using errcode = '23514'; end if;
  if selected_carrier is not null and selected_carrier not in ('POSTNORD','UPS') then
    raise exception 'Unsupported carrier' using errcode = '22023';
  end if;
  if new_status = 'SHIPPED' and (selected_carrier is null or nullif(btrim(selected_tracking_number),'') is null) then
    raise exception 'Carrier and tracking number are required to ship' using errcode = '23514';
  end if;

  insert into public.order_fulfilments(order_id,carrier,tracking_number,tracking_url,shipped_at,delivered_at)
  values(
    target_order_id, selected_carrier, nullif(btrim(selected_tracking_number),''),
    nullif(btrim(selected_tracking_url),''),
    case when new_status = 'SHIPPED' then now() end,
    case when new_status = 'DELIVERED' then now() end
  ) on conflict(order_id) do update set
    carrier = coalesce(excluded.carrier, public.order_fulfilments.carrier),
    tracking_number = coalesce(excluded.tracking_number, public.order_fulfilments.tracking_number),
    tracking_url = coalesce(excluded.tracking_url, public.order_fulfilments.tracking_url),
    shipped_at = coalesce(public.order_fulfilments.shipped_at, excluded.shipped_at),
    delivered_at = coalesce(public.order_fulfilments.delivered_at, excluded.delivered_at);

  update public.orders set
    fulfilment_status = new_status,
    status = case
      when status in ('PARTIALLY_REFUNDED','REFUNDED') then status
      when new_status = 'PROCESSING' then 'PROCESSING'::public.order_status
      when new_status = 'READY_TO_SHIP' then 'READY_TO_SHIP'::public.order_status
      when new_status = 'SHIPPED' then 'SHIPPED'::public.order_status
      when new_status = 'DELIVERED' then 'DELIVERED'::public.order_status
      else status
    end
  where id = target_order_id;
  insert into public.order_events(order_id,event_type,source,detail)
  values(target_order_id,'FULFILMENT_' || new_status::text,'ADMIN',jsonb_build_object(
    'previous_status', previous_status, 'carrier', selected_carrier,
    'tracking_number', nullif(btrim(selected_tracking_number),'')
  ));
  insert into public.admin_audit_log(actor_id,entity_type,entity_id,action)
  values(auth.uid(),'orders',target_order_id::text,'FULFILMENT:' || new_status::text);
end; $$;
revoke all on function public.admin_set_fulfilment(uuid,public.fulfilment_status,text,text,text) from public;
grant execute on function public.admin_set_fulfilment(uuid,public.fulfilment_status,text,text,text) to authenticated;

create function public.admin_add_order_note(target_order_id uuid, note_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform private.require_admin();
  if nullif(btrim(note_text),'') is null or char_length(btrim(note_text)) > 2000 then
    raise exception 'Note must contain between 1 and 2000 characters' using errcode = '22023';
  end if;
  if not exists(select 1 from public.orders where id = target_order_id) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  insert into public.order_internal_notes(order_id,author_id,note)
  values(target_order_id,auth.uid(),btrim(note_text)) returning id into new_id;
  insert into public.order_events(order_id,event_type,source,detail)
  values(target_order_id,'INTERNAL_NOTE_ADDED','ADMIN',jsonb_build_object('note_id',new_id));
  insert into public.admin_audit_log(actor_id,entity_type,entity_id,action)
  values(auth.uid(),'orders',target_order_id::text,'NOTE_ADDED');
  return new_id;
end; $$;
revoke all on function public.admin_add_order_note(uuid,text) from public;
grant execute on function public.admin_add_order_note(uuid,text) to authenticated;

create function public.admin_prepare_refund(
  target_order_id uuid, refund_request_key uuid, refund_amount bigint, refund_reason text, refund_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_order public.orders; reserved_amount bigint; new_id uuid; existing_order_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtextextended(target_order_id::text, 0));
  select id,order_id into new_id,existing_order_id from public.refunds where request_key = refund_request_key;
  if new_id is not null then
    if existing_order_id <> target_order_id then raise exception 'Refund request key conflict' using errcode = '23514'; end if;
    return new_id;
  end if;
  select * into current_order from public.orders where id = target_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if current_order.payment_status not in ('SUCCEEDED','PARTIALLY_REFUNDED') then
    raise exception 'Only settled payments can be refunded' using errcode = '23514';
  end if;
  if refund_reason not in ('REQUESTED_BY_CUSTOMER','DUPLICATE','FRAUDULENT','OTHER') then
    raise exception 'Invalid refund reason' using errcode = '22023';
  end if;
  if refund_amount <= 0 then raise exception 'Refund amount must be positive' using errcode = '22023'; end if;
  select coalesce(sum(amount),0) into reserved_amount from public.refunds
  where order_id = target_order_id and status in ('REQUESTED','PENDING','SUCCEEDED');
  if reserved_amount + refund_amount > current_order.total_amount then
    raise exception 'Refund exceeds the remaining order amount' using errcode = '23514';
  end if;
  insert into public.refunds(request_key,order_id,amount,currency,reason,note,requested_by)
  values(refund_request_key,target_order_id,refund_amount,current_order.currency,refund_reason,nullif(btrim(refund_note),''),auth.uid())
  returning id into new_id;
  insert into public.order_events(order_id,event_type,source,detail)
  values(target_order_id,'REFUND_REQUESTED','ADMIN',jsonb_build_object(
    'refund_id',new_id,'amount',refund_amount,'currency',current_order.currency,'reason',refund_reason
  ));
  insert into public.admin_audit_log(actor_id,entity_type,entity_id,action)
  values(auth.uid(),'orders',target_order_id::text,'REFUND_REQUESTED');
  return new_id;
end; $$;
revoke all on function public.admin_prepare_refund(uuid,uuid,bigint,text,text) from public;
grant execute on function public.admin_prepare_refund(uuid,uuid,bigint,text,text) to authenticated;

create function public.checkout_set_refund_provider(
  target_refund_id uuid, provider_refund_id text, current_provider_status text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.refunds set stripe_refund_id = provider_refund_id,
    provider_status = current_provider_status, status = 'PENDING'
  where id = target_refund_id and status = 'REQUESTED'
    and (stripe_refund_id is null or stripe_refund_id = provider_refund_id);
  if not found then raise exception 'Refund request is no longer pending' using errcode = '23514'; end if;
end; $$;
revoke all on function public.checkout_set_refund_provider(uuid,text,text) from public;
grant execute on function public.checkout_set_refund_provider(uuid,text,text) to service_role;

create function public.checkout_fail_refund_request(target_refund_id uuid, failure_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.refunds set status = 'FAILED', provider_failure_reason = left(failure_reason,500)
  where id = target_refund_id and status = 'REQUESTED';
end; $$;
revoke all on function public.checkout_fail_refund_request(uuid,text) from public;
grant execute on function public.checkout_fail_refund_request(uuid,text) to service_role;

create function public.checkout_process_refund_event(
  stripe_event_id text,
  stripe_event_type text,
  provider_refund_id text,
  target_order_id uuid,
  target_refund_id uuid,
  current_provider_status text,
  failure_reason text default null
) returns text language plpgsql security invoker set search_path = '' as $$
declare existing_result text; refund_row public.refunds; order_total bigint; successful_total bigint; mapped_status public.refund_status;
begin
  select result into existing_result from public.processed_webhook_events where event_id = stripe_event_id;
  if existing_result is not null then return 'DUPLICATE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_order_id::text, 0));
  select result into existing_result from public.processed_webhook_events where event_id = stripe_event_id;
  if existing_result is not null then return 'DUPLICATE'; end if;
  select * into refund_row from public.refunds where id = target_refund_id and order_id = target_order_id for update;
  if not found then raise exception 'Refund not found for Stripe event' using errcode = 'P0002'; end if;
  if refund_row.stripe_refund_id is not null and refund_row.stripe_refund_id <> provider_refund_id then
    raise exception 'Stripe refund does not match local refund' using errcode = '23514';
  end if;
  mapped_status := case
    when stripe_event_type = 'refund.failed' or current_provider_status = 'failed' then 'FAILED'::public.refund_status
    when current_provider_status = 'succeeded' then 'SUCCEEDED'::public.refund_status
    when current_provider_status = 'canceled' then 'CANCELLED'::public.refund_status
    else 'PENDING'::public.refund_status
  end;
  update public.refunds set stripe_refund_id = provider_refund_id, provider_status = current_provider_status,
    status = mapped_status, provider_failure_reason = left(failure_reason,500),
    processed_at = case when mapped_status in ('SUCCEEDED','FAILED','CANCELLED') then now() else processed_at end
  where id = target_refund_id;

  if mapped_status = 'SUCCEEDED' then
    select total_amount into order_total from public.orders where id = target_order_id for update;
    select coalesce(sum(amount),0) into successful_total from public.refunds
      where order_id = target_order_id and status = 'SUCCEEDED';
    if successful_total >= order_total then
      update public.orders set status = 'REFUNDED', payment_status = 'REFUNDED' where id = target_order_id;
      update public.payments set status = 'REFUNDED' where order_id = target_order_id;
    else
      update public.orders set status = 'PARTIALLY_REFUNDED', payment_status = 'PARTIALLY_REFUNDED' where id = target_order_id;
      update public.payments set status = 'PARTIALLY_REFUNDED' where order_id = target_order_id;
    end if;
  end if;
  insert into public.order_events(order_id,event_type,source,detail)
  values(target_order_id,upper(replace(stripe_event_type,'.','_')),'STRIPE',jsonb_build_object(
    'stripe_event_id',stripe_event_id,'refund_id',target_refund_id,
    'stripe_refund_id',provider_refund_id,'status',mapped_status
  ));
  insert into public.processed_webhook_events(event_id,event_type,object_id,order_id,result)
  values(stripe_event_id,stripe_event_type,provider_refund_id,target_order_id,'PROCESSED');
  return 'PROCESSED';
end; $$;
revoke all on function public.checkout_process_refund_event(text,text,text,uuid,uuid,text,text) from public;
grant execute on function public.checkout_process_refund_event(text,text,text,uuid,uuid,text,text) to service_role;
