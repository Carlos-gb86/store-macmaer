-- Serialize rate-limit checks with their writes. The previous read-then-insert
-- application flow could be exceeded by concurrent requests. These functions
-- remain callable only through the server-side service-role boundary.
create function public.submit_contact_message(document jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sender text := document->>'sender_hash';
  saved public.contact_messages;
begin
  if sender is null or sender !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid sender identity.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('contact:' || sender, 0));
  if (
    select count(*)
    from public.contact_messages
    where sender_hash = sender
      and created_at >= clock_timestamp() - interval '1 hour'
  ) >= 5 then
    raise exception using errcode = 'P0001',
      message = 'Too many messages were sent recently.';
  end if;

  insert into public.contact_messages(
    first_name, last_name, email, subject, message, sender_hash
  ) values (
    document->>'first_name',
    document->>'last_name',
    document->>'email',
    coalesce(document->>'subject', ''),
    document->>'message',
    sender
  ) returning * into saved;

  return jsonb_build_object(
    'id', saved.id,
    'first_name', saved.first_name,
    'last_name', saved.last_name,
    'email', saved.email,
    'subject', saved.subject,
    'message', saved.message
  );
end; $$;

create function public.submit_product_review(document jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sender text := document->>'email_hash';
  target_product uuid := (document->>'product_id')::uuid;
  verified_order uuid;
  saved_id uuid;
begin
  if sender is null or sender !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid review identity.';
  end if;
  if not exists (
    select 1 from public.products
    where id = target_product and status = 'active'
  ) then
    raise exception using errcode = 'P0001',
      message = 'The product is not available for review.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('review:' || sender, 0));
  if (
    select count(*)
    from public.product_reviews
    where email_hash = sender
      and created_at >= clock_timestamp() - interval '30 days'
  ) >= 3 then
    raise exception using errcode = 'P0001',
      message = 'Too many reviews were submitted recently.';
  end if;

  select orders.id into verified_order
  from public.orders
  join public.order_items on order_items.order_id = orders.id
  where orders.email_identity_hash = sender
    and orders.payment_status in ('SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED')
    and order_items.product_id = target_product
  order by orders.created_at desc
  limit 1;

  insert into public.product_reviews(
    product_id, order_id, display_name, email_hash, rating, title, body,
    verified_purchase, status, source
  ) values (
    target_product,
    verified_order,
    document->>'display_name',
    sender,
    (document->>'rating')::smallint,
    coalesce(document->>'title', ''),
    document->>'body',
    verified_order is not null,
    'PENDING',
    'CUSTOMER'
  ) returning id into saved_id;

  return saved_id;
end; $$;

revoke all on function public.submit_contact_message(jsonb) from public, anon, authenticated;
revoke all on function public.submit_product_review(jsonb) from public, anon, authenticated;
grant execute on function public.submit_contact_message(jsonb) to service_role;
grant execute on function public.submit_product_review(jsonb) to service_role;

comment on function public.submit_contact_message(jsonb) is
  'Atomically rate-limits and records a server-validated contact enquiry.';
comment on function public.submit_product_review(jsonb) is
  'Atomically rate-limits and records a moderated product review.';
