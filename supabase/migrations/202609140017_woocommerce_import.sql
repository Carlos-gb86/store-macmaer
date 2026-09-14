-- One-time WooCommerce catalogue migration support. Source records are read by
-- a local script; this function only accepts an already validated target
-- document and atomically replaces one imported product graph.
alter table public.products
  add column legacy_woocommerce_id bigint unique check (legacy_woocommerce_id > 0),
  add column legacy_metadata jsonb not null default '{}' check (jsonb_typeof(legacy_metadata) = 'object');

alter table public.collections
  add column legacy_woocommerce_id bigint unique check (legacy_woocommerce_id > 0);

alter table public.tags
  add column legacy_woocommerce_id bigint unique check (legacy_woocommerce_id > 0);

alter table public.product_variants
  add column legacy_woocommerce_id bigint unique check (legacy_woocommerce_id > 0),
  add column legacy_metadata jsonb not null default '{}' check (jsonb_typeof(legacy_metadata) = 'object');

alter table public.product_images
  add column legacy_wordpress_media_id bigint check (legacy_wordpress_media_id > 0);

-- Admin uploads always have an actor. Trusted import jobs do not impersonate an
-- administrator, so imported assets use a nullable actor plus an explicit,
-- unique source reference.
alter table public.media_assets alter column created_by drop not null;
alter table public.media_assets
  add column source text not null default 'ADMIN' check (source in ('ADMIN', 'WOOCOMMERCE')),
  add column source_reference text;
create unique index media_assets_source_reference
  on public.media_assets(source, source_reference)
  where source_reference is not null;

create function public.import_woocommerce_product(document jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  product_document jsonb := document->'product';
  option_document jsonb;
  value_document jsonb;
  variant_document jsonb;
  image_document jsonb;
  relation_id jsonb;
  target_id uuid;
  legacy_match uuid;
  slug_match uuid;
  legacy_id bigint;
begin
  if jsonb_typeof(product_document) <> 'object'
     or jsonb_typeof(coalesce(document->'options', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(document->'variants', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(document->'images', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(document->'collection_ids', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(document->'tag_ids', '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid WooCommerce import document' using errcode = '22023';
  end if;

  legacy_id := (product_document->>'legacy_woocommerce_id')::bigint;
  if legacy_id is null or legacy_id <= 0 then
    raise exception 'A positive legacy WooCommerce product ID is required' using errcode = '22023';
  end if;

  select id into legacy_match from public.products where legacy_woocommerce_id = legacy_id;
  select id into slug_match from public.products where slug = product_document->>'slug';
  if legacy_match is not null and slug_match is not null and legacy_match <> slug_match then
    raise exception 'WooCommerce product identity conflicts with an existing slug' using errcode = '23505';
  end if;
  target_id := coalesce(legacy_match, slug_match, (product_document->>'id')::uuid);

  insert into public.products(
    id, slug, title, subtitle, short_description, description,
    description_document, materials, care, status, base_price,
    compare_at_price, currency, sku, tax_category_key, shipping_class_key,
    inventory_strategy, stock_quantity, processing_time, weight_grams,
    dimensions, return_policy_class, featured, sort_order, seo_title,
    seo_description, created_at, legacy_woocommerce_id, legacy_metadata
  ) values (
    target_id,
    product_document->>'slug',
    product_document->>'title',
    nullif(product_document->>'subtitle', ''),
    coalesce(product_document->>'short_description', ''),
    coalesce(product_document->>'description', ''),
    nullif(product_document->'description_document', 'null'::jsonb),
    coalesce(product_document->>'materials', ''),
    coalesce(product_document->>'care', ''),
    (product_document->>'status')::public.product_status,
    (product_document->>'base_price')::integer,
    nullif(product_document->>'compare_at_price', '')::integer,
    product_document->>'currency',
    nullif(product_document->>'sku', ''),
    product_document->>'tax_category_key',
    product_document->>'shipping_class_key',
    (product_document->>'inventory_strategy')::public.inventory_strategy,
    nullif(product_document->>'stock_quantity', '')::integer,
    nullif(product_document->>'processing_time', ''),
    nullif(product_document->>'weight_grams', '')::integer,
    coalesce(product_document->'dimensions', '{}'::jsonb),
    product_document->>'return_policy_class',
    (product_document->>'featured')::boolean,
    (product_document->>'sort_order')::integer,
    nullif(product_document->>'seo_title', ''),
    nullif(product_document->>'seo_description', ''),
    coalesce(nullif(product_document->>'created_at', '')::timestamptz, clock_timestamp()),
    legacy_id,
    coalesce(product_document->'legacy_metadata', '{}'::jsonb)
  )
  on conflict (id) do update set
    slug = excluded.slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    short_description = excluded.short_description,
    description = excluded.description,
    description_document = excluded.description_document,
    materials = excluded.materials,
    care = excluded.care,
    status = excluded.status,
    base_price = excluded.base_price,
    compare_at_price = excluded.compare_at_price,
    currency = excluded.currency,
    sku = excluded.sku,
    tax_category_key = excluded.tax_category_key,
    shipping_class_key = excluded.shipping_class_key,
    inventory_strategy = excluded.inventory_strategy,
    stock_quantity = excluded.stock_quantity,
    processing_time = excluded.processing_time,
    weight_grams = excluded.weight_grams,
    dimensions = excluded.dimensions,
    return_policy_class = excluded.return_policy_class,
    featured = excluded.featured,
    sort_order = excluded.sort_order,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    legacy_woocommerce_id = excluded.legacy_woocommerce_id,
    legacy_metadata = excluded.legacy_metadata;

  -- This is a source-authoritative one-time catalogue import. Replacing the
  -- complete child graph prevents stale or duplicate configurations on rerun.
  delete from public.product_images where product_id = target_id;
  delete from public.variant_option_values where product_id = target_id;
  delete from public.product_variants where product_id = target_id;
  delete from public.product_option_values where product_id = target_id;
  delete from public.product_options where product_id = target_id;
  delete from public.product_collections where product_id = target_id;
  delete from public.product_tags where product_id = target_id;

  for option_document in
    select value from jsonb_array_elements(coalesce(document->'options', '[]'::jsonb))
  loop
    insert into public.product_options(
      id, product_id, key, label, display_type, required, is_variant_axis,
      affects_price, affects_weight, min_selections, max_selections,
      repeat_count, allow_duplicates, validation_rules, sort_order
    ) values (
      (option_document->>'id')::uuid, target_id, option_document->>'key',
      option_document->>'label', (option_document->>'display_type')::public.option_display_type,
      (option_document->>'required')::boolean, (option_document->>'is_variant_axis')::boolean,
      (option_document->>'affects_price')::boolean, (option_document->>'affects_weight')::boolean,
      (option_document->>'min_selections')::integer,
      nullif(option_document->>'max_selections', '')::integer,
      (option_document->>'repeat_count')::integer,
      (option_document->>'allow_duplicates')::boolean,
      coalesce(option_document->'validation_rules', '{}'::jsonb),
      (option_document->>'sort_order')::integer
    );

    for value_document in
      select value from jsonb_array_elements(coalesce(option_document->'values', '[]'::jsonb))
    loop
      insert into public.product_option_values(
        id, option_id, product_id, key, label, colour_hex, image_path,
        price_delta, weight_delta_grams, active, sort_order, asset_id
      ) values (
        (value_document->>'id')::uuid, (option_document->>'id')::uuid, target_id,
        value_document->>'key', value_document->>'label',
        nullif(value_document->>'colour_hex', ''), nullif(value_document->>'image_path', ''),
        (value_document->>'price_delta')::integer,
        (value_document->>'weight_delta_grams')::integer,
        (value_document->>'active')::boolean, (value_document->>'sort_order')::integer,
        nullif(value_document->>'asset_id', '')::uuid
      );
    end loop;
  end loop;

  for variant_document in
    select value from jsonb_array_elements(coalesce(document->'variants', '[]'::jsonb))
  loop
    insert into public.product_variants(
      id, product_id, sku, title, price_override, price_delta,
      compare_at_price, weight_override_grams, inventory_strategy,
      stock_quantity, active, sort_order, legacy_woocommerce_id, legacy_metadata
    ) values (
      (variant_document->>'id')::uuid, target_id, variant_document->>'sku',
      variant_document->>'title', nullif(variant_document->>'price_override', '')::integer,
      nullif(variant_document->>'price_delta', '')::integer,
      nullif(variant_document->>'compare_at_price', '')::integer,
      nullif(variant_document->>'weight_override_grams', '')::integer,
      (variant_document->>'inventory_strategy')::public.inventory_strategy,
      nullif(variant_document->>'stock_quantity', '')::integer,
      (variant_document->>'active')::boolean, (variant_document->>'sort_order')::integer,
      (variant_document->>'legacy_woocommerce_id')::bigint,
      coalesce(variant_document->'legacy_metadata', '{}'::jsonb)
    );

    for relation_id in
      select value from jsonb_array_elements(coalesce(variant_document->'value_ids', '[]'::jsonb))
    loop
      insert into public.variant_option_values(variant_id, product_id, option_id, value_id)
      select (variant_document->>'id')::uuid, target_id, option_id, id
      from public.product_option_values
      where id = (relation_id #>> '{}')::uuid and product_id = target_id;
    end loop;
  end loop;

  for image_document in
    select value from jsonb_array_elements(coalesce(document->'images', '[]'::jsonb))
  loop
    if coalesce(image_document->>'path', '') !~ '^woocommerce/[a-zA-Z0-9/_-]+\.webp$' then
      raise exception 'Imported images must reference a WooCommerce Storage object path' using errcode = '22023';
    end if;
    insert into public.product_images(
      id, product_id, variant_id, path, alt, width, height, is_primary,
      sort_order, asset_id, legacy_wordpress_media_id
    ) values (
      (image_document->>'id')::uuid, target_id,
      nullif(image_document->>'variant_id', '')::uuid,
      image_document->>'path', coalesce(image_document->>'alt', ''),
      (image_document->>'width')::integer, (image_document->>'height')::integer,
      (image_document->>'is_primary')::boolean, (image_document->>'sort_order')::integer,
      nullif(image_document->>'asset_id', '')::uuid,
      nullif(image_document->>'legacy_wordpress_media_id', '')::bigint
    );
  end loop;

  for relation_id in
    select value from jsonb_array_elements(coalesce(document->'collection_ids', '[]'::jsonb))
  loop
    insert into public.product_collections(product_id, collection_id, sort_order)
    values (target_id, (relation_id #>> '{}')::uuid, 0);
  end loop;

  for relation_id in
    select value from jsonb_array_elements(coalesce(document->'tag_ids', '[]'::jsonb))
  loop
    insert into public.product_tags(product_id, tag_id)
    values (target_id, (relation_id #>> '{}')::uuid);
  end loop;

  return target_id;
end; $$;

revoke all on function public.import_woocommerce_product(jsonb) from public, anon, authenticated;
grant execute on function public.import_woocommerce_product(jsonb) to service_role;
comment on function public.import_woocommerce_product(jsonb) is
  'Atomically replaces one validated WooCommerce product graph. Service role only.';
