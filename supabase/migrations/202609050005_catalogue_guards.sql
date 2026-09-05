-- Serialize cross-table SKU checks: a product and a variant cannot claim the same SKU.
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end; $$;
create function private.unique_catalogue_sku() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if new.sku is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('catalogue-skus',0));
 if (TG_TABLE_NAME='products' and exists(select 1 from public.product_variants where sku=new.sku))
 or (TG_TABLE_NAME='product_variants' and exists(select 1 from public.products where sku=new.sku)) then
  raise exception 'SKU already in use' using errcode='23505';
 end if;
 return new;
end; $$;
revoke all on function private.unique_catalogue_sku() from public;
create trigger product_sku_unique before insert or update of sku on public.products for each row execute function private.unique_catalogue_sku();
create trigger variant_sku_unique before insert or update of sku on public.product_variants for each row execute function private.unique_catalogue_sku();

-- Claim compensation while holding the same asset lock used by catalogue commits.
-- Draft references keep their originals; only unused public copies are reclaimed.
create function public.admin_claim_public_cleanup(asset uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.media_assets;
begin
 perform private.require_admin();
 select * into a from public.media_assets where id=asset for update;
 if not found or not a.cleanup_pending or a.public_path is null or a.lease_until>now() then return false; end if;
 if exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.asset_id=asset and p.status in ('active','archived'))
 or exists(select 1 from public.product_option_values v join public.products p on p.id=v.product_id where v.asset_id=asset and p.status in ('active','archived'))
 or exists(select 1 from public.collections where asset_id=asset and active)
 or exists(select 1 from public.homepage_content where hero_asset_id=asset or story_asset_id=asset) then return false; end if;
 update public.media_assets set status='deleting' where id=asset;
 return true;
end; $$;
revoke all on function public.admin_claim_public_cleanup(uuid) from public;
grant execute on function public.admin_claim_public_cleanup(uuid) to authenticated;

-- Match the existing presentation and initial featured ordering without inserting products.
update public.homepage_content set story_text=story_text || E'\n\nMacmaer brings together Scandinavian simplicity and a love of making — one knot at a time.';
insert into public.homepage_products select id,row_number() over(order by sort_order,id)::integer from public.products where status='active' and featured order by sort_order,id limit 4;
insert into public.homepage_collections select id,row_number() over(order by sort_order,id)::integer from public.collections where active;
