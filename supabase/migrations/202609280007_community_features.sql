-- Profile images are served by the app; only the server can write this path.
alter table public.profiles add column avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('profile-avatars','profile-avatars',false,8388608,array['image/jpeg']) on conflict(id) do nothing;

-- Public counts do not expose pending requests or private account information.
create function public.group_member_counts(p_groups uuid[]) returns table(group_id uuid, member_count bigint)
language sql stable security definer set search_path=public as $$
  select g.id,count(m.user_id) from public.groups g
  left join public.group_members m on m.group_id=g.id and m.status='active'
  where g.id=any(p_groups) group by g.id;
$$;
revoke all on function public.group_member_counts(uuid[]) from public;
grant execute on function public.group_member_counts(uuid[]) to anon,authenticated,service_role;

create function public.group_directory(p_group uuid)
returns table(id uuid,display_name text,has_avatar boolean,is_owner boolean,can_own boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if not (public.is_member(p_group) or public.is_admin()) then raise exception 'Join this group to see its members.'; end if;
  return query select p.id,p.display_name,p.avatar_path is not null,g.owner_id=p.id,
    exists(select 1 from auth.users u where u.id=p.id and u.email_confirmed_at is not null and lower(u.email) ~ '^[^@]+@illinois\.edu$'
      and (exists(select 1 from public.organizer_emails o where o.email=lower(u.email)) or exists(select 1 from public.platform_admins a where a.email=lower(u.email))))
    from public.group_members m join public.profiles p on p.id=m.user_id
    join public.groups g on g.id=m.group_id
    where m.group_id=p_group and m.status='active'
    order by (g.owner_id=p.id) desc,p.display_name,p.id;
end; $$;
revoke all on function public.group_directory(uuid) from public,anon;
grant execute on function public.group_directory(uuid) to authenticated,service_role;

create function public.edit_group_about(p_group uuid,p_description text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  if p_description is null or length(trim(p_description)) not between 10 and 500 then raise exception 'Use 10–500 characters for the group about section.'; end if;
  update public.groups set description=trim(p_description) where id=p_group;
  if not found then raise exception 'Group not found.'; end if;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'edit_group_about',jsonb_build_object('group',p_group));
end; $$;
revoke all on function public.edit_group_about(uuid,text) from public,anon;
grant execute on function public.edit_group_about(uuid,text) to authenticated;

-- Preserve the assignment algorithm and its internal membership guard. Only
-- the approved owner can invoke it; ordinary members cannot call it directly.
alter function public.refresh_missions(uuid) rename to refresh_missions_internal;
revoke all on function public.refresh_missions_internal(uuid) from public,anon,authenticated,service_role;
create function public.refresh_missions(p_group uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.owns_group(p_group) then raise exception 'Only the approved group organizer can refresh missions.'; end if;
  perform public.refresh_missions_internal(p_group);
end; $$;
revoke all on function public.refresh_missions(uuid) from public,anon;
grant execute on function public.refresh_missions(uuid) to authenticated;

-- Events are committed with the membership/report change, not sent in the
-- transaction. Leased delivery allows retries without losing a notification.
create table public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('group_joined','group_left','report_resolved')),
  subject_name text not null,
  group_id uuid,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text
);
create index on public.email_notifications(available_at) where sent_at is null;
alter table public.email_notifications enable row level security;
revoke all on public.email_notifications from public,anon,authenticated;
grant all on public.email_notifications to service_role;

create function public.notify_group_join() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then
    insert into public.email_notifications(user_id,kind,subject_name,group_id)
      select new.user_id,'group_joined',name,id from public.groups where id=new.group_id;
  end if;
  return new;
end; $$;
revoke all on function public.notify_group_join() from public,anon,authenticated,service_role;
create trigger notify_group_join after insert or update of status on public.group_members
  for each row execute function public.notify_group_join();

create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path=public as $$
declare g public.groups; membership_status text;
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into g from public.groups where id=p_group for update;
  if not found then raise exception 'Group not found.'; end if;
  if g.owner_id=auth.uid() then raise exception 'The group creator cannot leave their own group.'; end if;
  delete from public.group_members where group_id=p_group and user_id=auth.uid() returning status into membership_status;
  if membership_status='active' then
    insert into public.email_notifications(user_id,kind,subject_name,group_id) values(auth.uid(),'group_left',g.name,g.id);
  end if;
end; $$;
revoke all on function public.leave_group(uuid) from public,anon;
grant execute on function public.leave_group(uuid) to authenticated;

create function public.transfer_group_ownership(p_group uuid,p_owner uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  perform 1 from public.groups where id=p_group for update;
  if not public.owns_group(p_group) then raise exception 'Only the approved group owner can transfer ownership.'; end if;
  if p_owner=auth.uid() then raise exception 'Choose another group member.'; end if;
  perform 1 from public.group_members where group_id=p_group and user_id=p_owner and status='active' for update;
  if not found then raise exception 'The new owner must be an active group member.'; end if;
  if not exists(select 1 from auth.users u where u.id=p_owner and u.email_confirmed_at is not null and lower(u.email) ~ '^[^@]+@illinois\.edu$'
    and (exists(select 1 from public.organizer_emails o where o.email=lower(u.email)) or exists(select 1 from public.platform_admins a where a.email=lower(u.email)))) then
    raise exception 'The new owner must already be an approved organizer.';
  end if;
  update public.groups set owner_id=p_owner where id=p_group;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'transfer_group_ownership',jsonb_build_object('group',p_group,'owner',p_owner));
end; $$;
revoke all on function public.transfer_group_ownership(uuid,uuid) from public,anon;
grant execute on function public.transfer_group_ownership(uuid,uuid) to authenticated;

-- Snapshot human-readable names while the target still exists, including for
-- later report resolutions after a group is deleted.
alter table public.reports add column target_name text;
create function public.report_target_name(p_type text,p_target uuid) returns text
language sql stable security definer set search_path=public as $$
  select case p_type
    when 'group' then coalesce((select name from public.groups where id=p_target),'Deleted group')
    when 'profile' then coalesce((select display_name from public.profiles where id=p_target),'Deleted profile')
    when 'mission' then coalesce((select title from public.assignments where id=p_target),(select title from public.missions where id=p_target),'Removed mission')
    else 'Reported content' end;
$$;
revoke all on function public.report_target_name(text,uuid) from public,anon,authenticated,service_role;
update public.reports set target_name=public.report_target_name(target_type,target_id);
create function public.snapshot_report_name() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  new.target_name:=public.report_target_name(new.target_type,new.target_id);
  return new;
end; $$;
revoke all on function public.snapshot_report_name() from public,anon,authenticated,service_role;
create trigger snapshot_report_name before insert on public.reports for each row execute function public.snapshot_report_name();
create function public.notify_report_resolved() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.resolved and not old.resolved then
    insert into public.email_notifications(user_id,kind,subject_name)
      values(new.reporter_id,'report_resolved',coalesce(new.target_name,'Reported content'));
  end if;
  return new;
end; $$;
revoke all on function public.notify_report_resolved() from public,anon,authenticated,service_role;
create trigger notify_report_resolved after update of resolved on public.reports for each row execute function public.notify_report_resolved();

create function public.claim_email_notifications(p_limit integer default 5) returns setof public.email_notifications
language sql security definer set search_path=public as $$
  update public.email_notifications n set lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=n.attempts+1
    where n.id in (select id from public.email_notifications
      where sent_at is null and available_at<=now() and (lease_until is null or lease_until<now()) and attempts<8
      order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,5),10)))
    returning n.*;
$$;
revoke all on function public.claim_email_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_email_notifications(integer) to service_role;
