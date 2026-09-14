-- English remains the canonical/fallback catalogue language. Swedish fields
-- are nullable so incomplete translations never hide or invalidate a product.
alter table public.products
  add column title_sv text,
  add column subtitle_sv text,
  add column short_description_sv text,
  add column description_sv text,
  add column description_document_sv jsonb,
  add column materials_sv text,
  add column care_sv text,
  add column processing_time_sv text,
  add column seo_title_sv text,
  add column seo_description_sv text,
  add constraint products_description_document_sv_object
    check (description_document_sv is null or jsonb_typeof(description_document_sv) = 'object');

alter table public.collections
  add column name_sv text,
  add column description_sv text,
  add column description_document_sv jsonb,
  add column image_alt_sv text,
  add column seo_title_sv text,
  add column seo_description_sv text,
  add constraint collections_description_document_sv_object
    check (description_document_sv is null or jsonb_typeof(description_document_sv) = 'object');

alter table public.tags add column name_sv text;
alter table public.product_options add column label_sv text;
alter table public.product_option_values add column label_sv text;
alter table public.product_variants add column title_sv text;
alter table public.product_images add column alt_sv text;

alter table public.homepage_content
  add column announcement_sv text,
  add column hero_eyebrow_sv text,
  add column hero_title_sv text,
  add column hero_subtitle_sv text,
  add column hero_alt_sv text,
  add column hero_cta_label_sv text,
  add column story_eyebrow_sv text,
  add column story_title_sv text,
  add column story_text_sv text,
  add column story_alt_sv text;

-- Provide complete Swedish copy for the initial managed homepage. These
-- values remain editable in Admin and do not alter the English copy.
update public.homepage_content set
  announcement_sv = 'Lite handgjord värme, från Sverige till ditt hem',
  hero_eyebrow_sv = 'Skulpturala former. Mjukhet för varje dag.',
  hero_title_sv = 'Ett mjukare slags hem.',
  hero_subtitle_sv = 'Omsorgsfullt knutna kuddar och små detaljer att tycka om. Handgjorda för att göra ditt rum personligt.',
  hero_alt_sv = 'Skulptural elfenbensvit knutkudde bredvid en keramikvas',
  hero_cta_label_sv = 'Upptäck kollektionen',
  story_eyebrow_sv = 'Från våra händer till ditt hem',
  story_title_sv = 'Tillverkad långsamt. Älskad längre.',
  story_text_sv = 'Vi tror att sakerna omkring oss ska ha lite själ. En vacker struktur. En oväntad form. Den stillsamma karaktären hos något som är gjort för hand.\n\nMacmaer förenar skandinavisk enkelhet med skaparglädje – en knut i taget.',
  story_alt_sv = 'En handgjord elfenbensvit knutkudde som hålls nära';

comment on column public.products.title_sv is
  'Optional Swedish storefront title. English title is used when null or blank.';
comment on column public.tags.name_sv is
  'Optional Swedish storefront label. The stable slug remains language-neutral.';
