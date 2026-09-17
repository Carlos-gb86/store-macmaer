-- Reuse an already optimized, public product asset as the Velour collection
-- cover. No duplicate Storage object is created.
update public.collections
set description = 'Everyday softness with a smooth, tactile finish and a relaxed, playful feel.',
    description_sv = 'Mjuk vardagskänsla med en len, taktil yta och ett avslappnat, lekfullt uttryck.',
    image_path = 'woocommerce/sha256/54b2e761649672ae0530d8a7c993436e5094ab4b4e142042ecf33313d3b20ab3/image.webp',
    asset_id = (
      select id
      from public.media_assets
      where id = '9aae195f-5e63-5e33-a547-385c99cfe053'
    ),
    image_alt = 'Dusty lilac cotton velour round knot pillow beside a ceramic vase',
    image_alt_sv = 'Dovt lila rund knutkudde i bomullsvelour bredvid en keramikvas',
    sort_order = 2
where slug = 'velour'
  and kind = 'collection';

-- Keep the requested four collections in a predictable visual order even
-- though the WooCommerce import originally gave several categories order 0.
update public.collections
set sort_order = case slug
  when 'boucle' then 0
  when 'velvet' then 1
  when 'velour' then 2
  when 'limited-edition' then 3
end
where kind = 'collection'
  and slug in ('boucle', 'velvet', 'velour', 'limited-edition');
