-- Keep refund reconciliation monotonic when Stripe delivers events out of order,
-- and make the post-API provider attachment idempotent with a fast webhook.

create or replace function public.checkout_set_refund_provider(
  target_refund_id uuid, provider_refund_id text, current_provider_status text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.refunds set stripe_refund_id = provider_refund_id,
    provider_status = current_provider_status, status = 'PENDING', provider_failure_reason = null
  where id = target_refund_id and status in ('REQUESTED','FAILED')
    and (stripe_refund_id is null or stripe_refund_id = provider_refund_id);
  if not found and not exists(
    select 1 from public.refunds where id = target_refund_id and stripe_refund_id = provider_refund_id
  ) then raise exception 'Refund request is no longer pending' using errcode = '23514'; end if;
end; $$;
revoke all on function public.checkout_set_refund_provider(uuid,text,text) from public;
grant execute on function public.checkout_set_refund_provider(uuid,text,text) to service_role;

create or replace function public.checkout_process_refund_event(
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
  if refund_row.status in ('SUCCEEDED','FAILED','CANCELLED') and mapped_status = 'PENDING' then
    mapped_status := refund_row.status;
  end if;
  if refund_row.status = 'SUCCEEDED' then mapped_status := 'SUCCEEDED'; end if;
  update public.refunds set stripe_refund_id = provider_refund_id,
    provider_status = case
      when status in ('SUCCEEDED','FAILED','CANCELLED')
        and current_provider_status not in ('succeeded','failed','canceled') then provider_status
      else current_provider_status
    end,
    status = mapped_status,
    provider_failure_reason = case
      when mapped_status = 'FAILED' then coalesce(left(failure_reason,500),provider_failure_reason)
      else null
    end,
    processed_at = case
      when mapped_status in ('SUCCEEDED','FAILED','CANCELLED') then coalesce(processed_at,now())
      else processed_at
    end
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
