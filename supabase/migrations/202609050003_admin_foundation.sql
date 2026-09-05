create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
create table private.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
revoke all on private.admin_users from public, anon, authenticated;
grant all on private.admin_users to service_role;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
select exists(select 1 from private.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
create function private.require_admin() returns void language plpgsql security invoker set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
end; $$;
revoke all on function private.require_admin() from public;
grant execute on function private.require_admin() to authenticated;
do $$
declare t text;
begin
 foreach t in array array['products','collections','tags','product_collections','product_tags','product_options','product_option_values','product_variants','variant_option_values','product_images'] loop
  execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))', t);
  execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
  execute format('create policy admin_update on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  execute format('grant insert, update on public.%I to authenticated', t);
  if t not in ('products','collections') then
   execute format('create policy admin_delete on public.%I for delete to authenticated using ((select public.is_admin()))', t);
   execute format('grant delete on public.%I to authenticated', t);
  end if;
 end loop;
end; $$;
create table public.media_assets (
 id uuid primary key default gen_random_uuid(), original_name text not null,
 private_path text not null unique, public_path text unique, public_ready boolean not null default false,
 status text not null default 'uploading' check(status in ('uploading','ready','invalid','deleting')),
 mime_type text, byte_size integer check(byte_size between 1 and 10485760), width integer check(width > 0), height integer check(height > 0),
 cleanup_pending boolean not null default false, lease_until timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
create policy admin_media on public.media_assets to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant all on public.media_assets to service_role;
alter table public.products add column description_document jsonb;
alter table public.collections add column description_document jsonb;
alter table public.product_images add column asset_id uuid references public.media_assets(id);
alter table public.product_option_values add column asset_id uuid references public.media_assets(id);
alter table public.collections add column asset_id uuid references public.media_assets(id);
alter table public.tags add column updated_at timestamptz not null default now();
create trigger tags_updated_at before update on public.tags for each row execute function public.set_updated_at();
create index product_images_asset on public.product_images(asset_id);
create index option_values_asset on public.product_option_values(asset_id);
create index collections_asset on public.collections(asset_id);
create table public.homepage_content (
 id boolean primary key default true check(id),
 announcement text not null default 'A little handmade warmth, from Sweden to your home',
 hero_eyebrow text not null default 'Sculptural shapes. Everyday softness.',
 hero_title text not null default 'A softer kind of home.',
 hero_subtitle text not null default 'Thoughtfully knotted pillows and little things to love. Made by hand, to make a space your own.',
 hero_image text not null default '/images/catalogue/story.jpg', hero_alt text not null default 'Sculptural ivory knot pillow beside a ceramic vase',
 hero_asset_id uuid references public.media_assets(id), hero_cta_label text not null default 'Discover the collection',
 hero_cta_path text not null default '/shop', hero_visible boolean not null default true,
 story_eyebrow text not null default 'From our hands to your home', story_title text not null default 'Made slowly. Loved for longer.',
 story_text text not null default 'We believe the things around us should have a little soul. A beautiful texture. An unexpected shape. The quiet character of something made by hand.',
 story_image text not null default '/images/catalogue/cotton.jpg', story_alt text not null default 'A handmade ivory knot pillow held close',
 story_asset_id uuid references public.media_assets(id), story_visible boolean not null default true,
 featured_visible boolean not null default true, collections_visible boolean not null default true,
 updated_at timestamptz not null default now()
);
insert into public.homepage_content(id) values(true);
create table public.homepage_products(product_id uuid primary key references public.products(id), sort_order integer not null);
create table public.homepage_collections(collection_id uuid primary key references public.collections(id), sort_order integer not null);
create trigger homepage_updated_at before update on public.homepage_content for each row execute function public.set_updated_at();
do $$
declare t text;
begin
 foreach t in array array['homepage_content','homepage_products','homepage_collections'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon, authenticated', t);
  execute format('grant select on public.%I to anon, authenticated', t);
  execute format('grant insert, update, delete on public.%I to authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', t);
  execute format('create policy admin_write on public.%I to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
 end loop;
end; $$;
alter policy public_read on public.homepage_products using (exists(select 1 from public.products where id = product_id));
alter policy public_read on public.homepage_collections using (exists(select 1 from public.collections where id = collection_id));
create table public.admin_audit_log (
 id uuid primary key default gen_random_uuid(), actor_id uuid, entity_type text not null, entity_id text not null,
 action text not null, created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
create policy admin_audit_read on public.admin_audit_log for select to authenticated using ((select public.is_admin()));
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.admin_audit_log(actor_id, entity_type, entity_id, action)
 values(auth.uid(), TG_TABLE_NAME, new.id::text, case when TG_TABLE_NAME = 'products' then TG_OP || ':' || (to_jsonb(new)->>'status') else TG_OP end);
 return new;
end; $$;
revoke all on function private.audit_change() from public;
create trigger product_audit after insert or update on public.products for each row execute function private.audit_change();
create trigger collection_audit after insert or update on public.collections for each row execute function private.audit_change();
create trigger content_audit after update on public.homepage_content for each row execute function private.audit_change();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogue-drafts','catalogue-drafts',false,10485760,array['image/jpeg','image/png','image/webp','image/avif']);
create policy admin_catalogue_storage on storage.objects to authenticated
using(bucket_id in ('catalogue','catalogue-drafts') and (select public.is_admin()))
with check(bucket_id in ('catalogue','catalogue-drafts') and (select public.is_admin()));
