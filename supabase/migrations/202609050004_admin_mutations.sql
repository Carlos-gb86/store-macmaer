-- Only these tables can be written by the internal JSON upsert helper. RLS remains active.
create function private.upsert_catalogue_row(target text, data jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare columns_sql text; updates_sql text;
begin
 perform private.require_admin();
 if target <> all(array['products','collections','tags','product_options','product_option_values','product_variants','product_images','homepage_content']) then
  raise exception 'Invalid catalogue table' using errcode='22023';
 end if;
 data := data - 'created_at' - 'updated_at';
 select string_agg(format('%I',a.attname),',' order by a.attnum),
        string_agg(format('%I=excluded.%I',a.attname,a.attname),',' order by a.attnum) filter(where a.attname <> 'id')
 into columns_sql, updates_sql
 from pg_attribute a where a.attrelid = ('public.'||target)::regclass and a.attnum > 0 and not a.attisdropped and data ? a.attname;
 execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(id) do update set %s',target,columns_sql,columns_sql,target,updates_sql) using data;
end; $$;
revoke all on function private.upsert_catalogue_row(text,jsonb) from public;
grant execute on function private.upsert_catalogue_row(text,jsonb) to authenticated;

create function private.assert_child_owner(target text, child uuid, parent uuid) returns void language plpgsql security invoker set search_path = '' as $$
declare other boolean;
begin
 if target <> all(array['product_options','product_option_values','product_variants','product_images']) then raise exception 'Invalid child table'; end if;
 execute format('select exists(select 1 from public.%I where id=$1 and product_id<>$2)',target) into other using child,parent;
 if other then raise exception 'Cross-product reference' using errcode='23514'; end if;
end; $$;
revoke all on function private.assert_child_owner(text,uuid,uuid) from public;
grant execute on function private.assert_child_owner(text,uuid,uuid) to authenticated;

create function private.validate_product(p jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare o jsonb; v jsonb; value_id text; axes integer; count_values integer; unique_values integer;
begin
 if p->>'currency' <> 'SEK' then raise exception 'Catalogue currency must be SEK' using errcode='23514'; end if;
 if exists(select 1 from jsonb_array_elements(p->'options') x group by x->>'key' having count(*)>1) then raise exception 'Duplicate option key' using errcode='23514'; end if;
 select count(*) into axes from jsonb_array_elements(p->'options') x where (x->>'is_variant_axis')::boolean;
 for o in select * from jsonb_array_elements(p->'options') loop
  if exists(select 1 from jsonb_array_elements(o->'values') x group by x->>'key' having count(*)>1) then raise exception 'Duplicate value key' using errcode='23514'; end if;
 end loop;
 for v in select * from jsonb_array_elements(p->'variants') loop
  if v->>'price_override' is not null and v->>'price_delta' is not null then raise exception 'Use price override or delta' using errcode='23514'; end if;
  if coalesce((v->>'price_override')::integer,(p->>'base_price')::integer+coalesce((v->>'price_delta')::integer,0)) < 0 then raise exception 'Negative variant price' using errcode='23514'; end if;
  select count(*),count(distinct x) into count_values,unique_values from jsonb_array_elements_text(v->'value_ids') x;
  if count_values<>axes or unique_values<>axes or axes=0 then raise exception 'Incomplete variant axes' using errcode='23514'; end if;
  for o in select * from jsonb_array_elements(p->'options') where (value->>'is_variant_axis')::boolean loop
   if (select count(*) from jsonb_array_elements(o->'values') x where (x->>'active')::boolean and (v->'value_ids') ? (x->>'id')) <> 1 then
    raise exception 'Variant refers to missing or inactive value' using errcode='23514';
   end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements(p->'variants') x group by (select string_agg(z,',' order by z) from jsonb_array_elements_text(x->'value_ids') z) having count(*)>1) then raise exception 'Duplicate variant combination' using errcode='23514'; end if;
 if p->>'status'='active' and axes>0 and not exists(select 1 from jsonb_array_elements(p->'variants') x where (x->>'active')::boolean) then raise exception 'Publish at least one valid variant' using errcode='23514'; end if;
 if jsonb_array_length(p->'images')>0 and (select count(*) from jsonb_array_elements(p->'images') x where (x->>'is_primary')::boolean)<>1 then raise exception 'Choose one primary image' using errcode='23514'; end if;
end; $$;
revoke all on function private.validate_product(jsonb) from public;
grant execute on function private.validate_product(jsonb) to authenticated;

create function private.check_asset(asset uuid, publishing boolean) returns void language plpgsql security invoker set search_path = '' as $$
declare a public.media_assets;
begin
 if asset is null then return; end if;
 select * into a from public.media_assets where id=asset for update;
 if not found or a.status<>'ready' or (publishing and not a.public_ready) then raise exception 'Image is not ready' using errcode='23514'; end if;
end; $$;
revoke all on function private.check_asset(uuid,boolean) from public;
grant execute on function private.check_asset(uuid,boolean) to authenticated;

create function public.admin_save_product(document jsonb, expected_updated_at timestamptz default null) returns jsonb language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_column
declare pid uuid := (document->>'id')::uuid; current_stamp timestamptz; o jsonb; v jsonb; x jsonb; option_id uuid; id_text text;
begin
 perform private.require_admin();
 perform pg_advisory_xact_lock(hashtextextended(pid::text,0));
 select updated_at into current_stamp from public.products where id=pid for update;
 if current_stamp is distinct from expected_updated_at then raise exception 'This product changed. Reload before saving.' using errcode='PT409'; end if;
 perform private.validate_product(document);
 for x in select * from jsonb_array_elements(document->'images') loop
  perform private.assert_child_owner('product_images',(x->>'id')::uuid,pid);
  perform private.check_asset((x->>'asset_id')::uuid,document->>'status'='active');
 end loop;
 for o in select * from jsonb_array_elements(document->'options') loop
  perform private.assert_child_owner('product_options',(o->>'id')::uuid,pid);
  for x in select * from jsonb_array_elements(o->'values') loop
   perform private.assert_child_owner('product_option_values',(x->>'id')::uuid,pid);
   perform private.check_asset((x->>'asset_id')::uuid,document->>'status'='active');
  end loop;
 end loop;
 for v in select * from jsonb_array_elements(document->'variants') loop
  perform private.assert_child_owner('product_variants',(v->>'id')::uuid,pid);
 end loop;
 perform private.upsert_catalogue_row('products',document);
 -- Remove relations first, preserve the identities of retained options/values/variants/images.
 delete from public.variant_option_values where product_id=pid;
 delete from public.product_images where product_id=pid and not exists(select 1 from jsonb_array_elements(document->'images') x where (x->>'id')::uuid=product_images.id);
 update public.product_images set is_primary=false where product_id=pid;
 delete from public.product_variants where product_id=pid and not exists(select 1 from jsonb_array_elements(document->'variants') x where (x->>'id')::uuid=product_variants.id);
 delete from public.product_option_values where product_id=pid and not exists(select 1 from jsonb_array_elements(document->'options') o cross join lateral jsonb_array_elements(o->'values') x where (x->>'id')::uuid=product_option_values.id);
 delete from public.product_options where product_id=pid and not exists(select 1 from jsonb_array_elements(document->'options') x where (x->>'id')::uuid=product_options.id);
 for o in select * from jsonb_array_elements(document->'options') loop
  perform private.upsert_catalogue_row('product_options',o||jsonb_build_object('product_id',pid));
  for x in select * from jsonb_array_elements(o->'values') loop
   perform private.upsert_catalogue_row('product_option_values',x||jsonb_build_object('product_id',pid,'option_id',o->>'id'));
  end loop;
 end loop;
 for v in select * from jsonb_array_elements(document->'variants') loop
  perform private.upsert_catalogue_row('product_variants',v||jsonb_build_object('product_id',pid));
  for id_text in select * from jsonb_array_elements_text(v->'value_ids') loop
   select ov.option_id into option_id from public.product_option_values ov where ov.id=id_text::uuid and ov.product_id=pid;
   insert into public.variant_option_values(variant_id,product_id,option_id,value_id) values((v->>'id')::uuid,pid,option_id,id_text::uuid);
  end loop;
 end loop;
 for x in select * from jsonb_array_elements(document->'images') loop
  perform private.upsert_catalogue_row('product_images',x||jsonb_build_object('product_id',pid));
 end loop;
 delete from public.product_collections where product_id=pid;
 insert into public.product_collections(product_id,collection_id,sort_order)
 select pid,c.id,j.ordinality::integer from jsonb_array_elements_text(document->'collections') with ordinality j(slug,ordinality) join public.collections c on c.slug=j.slug;
 if (select count(*) from public.product_collections where product_id=pid)<>jsonb_array_length(document->'collections') then raise exception 'Unknown collection' using errcode='23514'; end if;
 delete from public.product_tags where product_id=pid;
 insert into public.product_tags(product_id,tag_id) select pid,t.id from jsonb_array_elements_text(document->'tags') j(slug) join public.tags t on t.slug=j.slug;
 if (select count(*) from public.product_tags where product_id=pid)<>jsonb_array_length(document->'tags') then raise exception 'Unknown tag' using errcode='23514'; end if;
 return (select jsonb_build_object('id',id,'updated_at',updated_at) from public.products where id=pid);
end; $$;
revoke all on function public.admin_save_product(jsonb,timestamptz) from public;
grant execute on function public.admin_save_product(jsonb,timestamptz) to authenticated;

create function public.admin_save_collection(document jsonb, expected_updated_at timestamptz default null) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare cid uuid := (document->>'id')::uuid; stamp timestamptz;
begin
 perform private.require_admin();
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 select updated_at into stamp from public.collections where id=cid for update;
 if stamp is distinct from expected_updated_at then raise exception 'Collection changed. Reload before saving.' using errcode='PT409'; end if;
 perform private.check_asset((document->>'asset_id')::uuid,(document->>'active')::boolean);
 perform private.upsert_catalogue_row('collections',document);
 return (select jsonb_build_object('id',id,'updated_at',updated_at) from public.collections where id=cid);
end; $$;
revoke all on function public.admin_save_collection(jsonb,timestamptz) from public;
grant execute on function public.admin_save_collection(jsonb,timestamptz) to authenticated;

create function public.admin_save_homepage(document jsonb, product_ids jsonb, collection_ids jsonb, expected_updated_at timestamptz) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare stamp timestamptz;
begin
 perform private.require_admin();
 select updated_at into stamp from public.homepage_content where id for update;
 if stamp is distinct from expected_updated_at then raise exception 'Homepage changed. Reload before saving.' using errcode='PT409'; end if;
 perform private.check_asset((document->>'hero_asset_id')::uuid,true);
 perform private.check_asset((document->>'story_asset_id')::uuid,true);
 perform private.upsert_catalogue_row('homepage_content',document||'{"id":true}'::jsonb);
 delete from public.homepage_products where product_id is not null;
 insert into public.homepage_products select x::uuid,n::integer from jsonb_array_elements_text(product_ids) with ordinality j(x,n);
 delete from public.homepage_collections where collection_id is not null;
 insert into public.homepage_collections select x::uuid,n::integer from jsonb_array_elements_text(collection_ids) with ordinality j(x,n);
 return (select jsonb_build_object('updated_at',updated_at) from public.homepage_content where id);
end; $$;
revoke all on function public.admin_save_homepage(jsonb,jsonb,jsonb,timestamptz) from public;
grant execute on function public.admin_save_homepage(jsonb,jsonb,jsonb,timestamptz) to authenticated;

create function public.admin_mutate_tag(operation text, document jsonb, expected_updated_at timestamptz default null, target_id uuid default null) returns void language plpgsql security invoker set search_path = '' as $$
declare tid uuid := (document->>'id')::uuid; stamp timestamptz;
begin
 perform private.require_admin();
 -- Serialize merges in both directions and membership changes from other tag operations.
 perform pg_advisory_xact_lock(hashtextextended('catalogue-tags',0));
 select updated_at into stamp from public.tags where id=tid for update;
 if stamp is distinct from expected_updated_at then raise exception 'Tag changed. Reload before saving.' using errcode='PT409'; end if;
 if operation='save' then perform private.upsert_catalogue_row('tags',document);
 elsif operation='merge' then
  if target_id=tid or not exists(select 1 from public.tags where id=target_id) then raise exception 'Choose a different target tag' using errcode='23514'; end if;
  insert into public.product_tags(product_id,tag_id) select product_id,target_id from public.product_tags where tag_id=tid on conflict do nothing;
  delete from public.product_tags where tag_id=tid;
  delete from public.tags where id=tid;
 elsif operation='delete' then
  if exists(select 1 from public.product_tags where tag_id=tid) then raise exception 'Tag is still in use' using errcode='23514'; end if;
  delete from public.tags where id=tid;
 else raise exception 'Invalid tag operation' using errcode='22023'; end if;
end; $$;
revoke all on function public.admin_mutate_tag(text,jsonb,timestamptz,uuid) from public;
grant execute on function public.admin_mutate_tag(text,jsonb,timestamptz,uuid) to authenticated;

create function public.admin_media_references(asset uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.product_images where asset_id=asset)
 or exists(select 1 from public.product_option_values where asset_id=asset)
 or exists(select 1 from public.collections where asset_id=asset)
 or exists(select 1 from public.homepage_content where hero_asset_id=asset or story_asset_id=asset);
$$;
revoke all on function public.admin_media_references(uuid) from public;
grant execute on function public.admin_media_references(uuid) to authenticated;
create function public.admin_claim_media_cleanup(asset uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.media_assets;
begin
 perform private.require_admin();
 select * into a from public.media_assets where id=asset for update;
 if not found or a.lease_until>now() or public.admin_media_references(asset) then return false; end if;
 update public.media_assets set status='deleting',cleanup_pending=true where id=asset;
 return true;
end; $$;
revoke all on function public.admin_claim_media_cleanup(uuid) from public;
grant execute on function public.admin_claim_media_cleanup(uuid) to authenticated;
