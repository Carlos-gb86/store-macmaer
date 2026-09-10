-- Keep a delayed `payment_intent.processing` event from downgrading a payment
-- that a newer `payment_intent.succeeded` event has already completed.
create or replace function public.checkout_process_stripe_event(
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
    update public.orders set payment_status = 'PROCESSING'
    where id = target_order_id and payment_status <> 'SUCCEEDED';
  elsif stripe_event_type = 'payment_intent.payment_failed' then
    update public.payments set status = 'FAILED', last_provider_error = left(provider_error, 500)
    where order_id = target_order_id and status <> 'SUCCEEDED';
    update public.orders set payment_status = 'FAILED'
    where id = target_order_id and payment_status <> 'SUCCEEDED';
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
      update public.payments set status = 'SUCCEEDED', last_provider_error = null
      where order_id = target_order_id;
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
