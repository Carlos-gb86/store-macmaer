-- Phase 7: moderated product reviews, homepage testimonials, and an auditable
-- legacy URL map. Public submissions use the service-only application path;
-- anonymous database writes remain disabled.
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  email_hash text check (email_hash is null or email_hash ~ '^[0-9a-f]{64}$'),
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 5000),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  verified_purchase boolean not null default false,
  source text not null default 'CUSTOMER' check (source in ('CUSTOMER','WOOCOMMERCE','ADMIN')),
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_reference)
);
create index product_reviews_public on public.product_reviews(product_id, created_at desc, id) where status = 'APPROVED';
create index product_reviews_moderation on public.product_reviews(status, created_at desc, id);
create index product_reviews_sender on public.product_reviews(email_hash, created_at desc) where email_hash is not null;

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  review_id uuid unique references public.product_reviews(id) on delete set null,
  quote text not null check (char_length(quote) between 10 and 1000),
  attribution text not null check (char_length(attribution) between 1 and 120),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index testimonials_public on public.testimonials(sort_order, id) where active;

create table public.legacy_redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique check (source_path ~ '^/[^?#]*$'),
  destination_path text not null check (destination_path ~ '^/[^?#]*$'),
  permanent boolean not null default true,
  source_reference text,
  created_at timestamptz not null default now(),
  check (source_path <> destination_path)
);

create trigger product_reviews_updated_at before update on public.product_reviews
for each row execute function public.set_updated_at();
create trigger testimonials_updated_at before update on public.testimonials
for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['product_reviews','testimonials','legacy_redirects'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_all on public.%I to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end; $$;

grant select on public.product_reviews, public.testimonials to anon;
grant select on public.product_reviews, public.testimonials to authenticated;
create policy public_approved_reviews on public.product_reviews for select to anon, authenticated
using (
  status = 'APPROVED'
  and exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
);
create policy public_active_testimonials on public.testimonials for select to anon, authenticated
using (active and (review_id is null or exists (
  select 1 from public.product_reviews r where r.id = review_id and r.status = 'APPROVED'
)));

create trigger review_audit after insert or update on public.product_reviews
for each row execute function private.audit_change();
create trigger testimonial_audit after insert or update on public.testimonials
for each row execute function private.audit_change();

