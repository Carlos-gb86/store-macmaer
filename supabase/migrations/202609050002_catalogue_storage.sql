-- Public, published catalogue assets only. Draft/private assets must use a separate private bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogue', 'catalogue', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
-- Bucket reads are public by design; no browser upload/update/delete policies in Phase 1.
