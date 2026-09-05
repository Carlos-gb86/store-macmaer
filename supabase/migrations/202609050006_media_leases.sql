alter table public.media_assets add column lease_token uuid;
alter table public.media_assets add column upload_expires_at timestamptz;
create function public.admin_acquire_media_lease(asset uuid, token uuid) returns void language plpgsql security invoker set search_path='' as $$
declare a public.media_assets;
begin
 perform private.require_admin();
 select * into a from public.media_assets where id=asset for update;
 if not found or a.status<>'ready' then raise exception 'Image is not ready' using errcode='23514'; end if;
 if a.lease_until>now() and a.lease_token is distinct from token then raise exception 'Image is being saved. Retry shortly.' using errcode='PT409'; end if;
 update public.media_assets set lease_token=token,lease_until=now()+interval '10 minutes' where id=asset;
end; $$;
revoke all on function public.admin_acquire_media_lease(uuid,uuid) from public;
grant execute on function public.admin_acquire_media_lease(uuid,uuid) to authenticated;
create or replace function public.admin_claim_media_cleanup(asset uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.media_assets;
begin
 perform private.require_admin();
 select * into a from public.media_assets where id=asset for update;
 if not found or a.lease_until>now() or a.upload_expires_at>now() or public.admin_media_references(asset) then return false; end if;
 update public.media_assets set status='deleting',cleanup_pending=true where id=asset;
 return true;
end; $$;
