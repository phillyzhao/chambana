-- Serialize category edits with ownership transfers and mission draws.
create function public.update_group_categories(p_group uuid, p_categories uuid[]) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from public.groups where id=p_group for update;
  if not public.owns_group(p_group) then raise exception 'Only the approved group organizer can edit categories.'; end if;
  if coalesce(cardinality(p_categories),0)>10 then raise exception 'Choose no more than ten categories.'; end if;
  if exists(select 1 from unnest(p_categories) c(id) where c.id is null or not exists(select 1 from public.categories where id=c.id)) then
    raise exception 'Choose valid mission categories.';
  end if;
  delete from public.group_categories where group_id=p_group;
  insert into public.group_categories(group_id,category_id) select distinct p_group,unnest(p_categories);
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'update_group_categories',jsonb_build_object('group',p_group,'categories',coalesce(p_categories,array[]::uuid[])));
end; $$;
revoke all on function public.update_group_categories(uuid,uuid[]) from public,anon;
grant execute on function public.update_group_categories(uuid,uuid[]) to authenticated;

-- Reporting follows current ownership, even if organizer access is revoked.
-- Keep the existing authentication, account lock and report rate limit.
create or replace function public.report_content(p_type text,p_target uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare group_owner uuid;
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if p_type='group' then
    select owner_id into group_owner from public.groups where id=p_target for update;
    if not found or group_owner=auth.uid() or not public.is_member(p_target) then
      raise exception 'Only active members other than the group owner can report this group.';
    end if;
  end if;
  perform public.report_content_internal(p_type,p_target,p_reason);
end; $$;
