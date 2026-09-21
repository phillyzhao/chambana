-- All scoring and mission transitions occur in database transactions.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 40),
  bio text not null default '' check (length(bio) <= 240),
  created_at timestamptz not null default now()
);
create table public.platform_admins (email text primary key check (email = lower(email) and email ~ '^[^@]+@illinois\.edu$'));
create table public.organizer_emails (
  email text primary key check (email = lower(email) and email ~ '^[^@]+@illinois\.edu$'),
  approved_by uuid references auth.users(id), approved_at timestamptz not null default now()
);
create table public.settings (
  id boolean primary key default true check (id),
  mission_slots integer not null default 3 check (mission_slots between 1 and 3),
  mission_seconds integer not null default 86400 check (mission_seconds between 300 and 604800),
  cooldown_seconds integer not null default 3600 check (cooldown_seconds between 60 and 604800)
);
insert into public.settings default values;
create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null unique
);
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 3 and 60),
  description text not null check (length(description) between 10 and 500),
  owner_id uuid not null references public.profiles(id),
  join_mode text not null check (join_mode in ('open','invite','organization')),
  organization text not null default '' check (length(organization) <= 120),
  organization_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.group_categories (
  group_id uuid references public.groups(id) on delete cascade,
  category_id uuid references public.categories(id), primary key (group_id, category_id)
);
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','active')),
  joined_at timestamptz not null default now(), primary key (group_id, user_id)
);
create index on public.group_members(user_id, status);
create table public.group_invites (
  code text primary key, group_id uuid not null references public.groups(id) on delete cascade,
  expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.missions (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id),
  title text not null check (length(title) between 3 and 100),
  instructions text not null check (length(instructions) between 10 and 2000),
  proof_criteria text not null check (length(proof_criteria) between 10 and 1500),
  nuts integer not null check (nuts between 1 and 1000),
  published boolean not null default false, created_at timestamptz not null default now()
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id),
  mission_id uuid not null references public.missions(id), slot integer not null check (slot between 1 and 3),
  status text not null default 'active' check (status in ('active','completed','declined','expired')),
  -- Snapshot rules so editing a mission cannot change an in-flight challenge.
  title text not null, instructions text not null, proof_criteria text not null, nuts integer not null,
  assigned_at timestamptz not null default now(), expires_at timestamptz not null,
  available_at timestamptz not null, cooldown_seconds integer not null,
  completed_by uuid references public.profiles(id),
  unique(group_id, mission_id)
);
create index on public.assignments(group_id, slot, assigned_at desc);
create unique index one_active_assignment_per_slot on public.assignments(group_id, slot) where status = 'active';
create table public.submissions (
  id uuid primary key, assignment_id uuid not null references public.assignments(id),
  user_id uuid not null references public.profiles(id),
  media_kind text not null default 'photo' check (media_kind in ('photo','video')),
  storage_path text not null unique, photo_hash text,
  status text not null default 'uploading' check (status in ('uploading','pending','processing','approved','rejected','needs_review','superseded')),
  reason text, ai_result jsonb, attempts integer not null default 0,
  lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_live_submission on public.submissions(assignment_id)
  where status in ('uploading','pending','processing','needs_review');
create unique index unique_photo_per_user on public.submissions(user_id, photo_hash) where photo_hash is not null;
create index on public.submissions(status, created_at);
create table public.nut_transactions (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null unique references public.assignments(id),
  group_id uuid not null references public.groups(id), user_id uuid not null references public.profiles(id),
  amount integer not null check (amount > 0), created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('profile','group','mission')),
  target_id uuid not null, reason text not null check (length(reason) between 10 and 1000),
  resolved boolean not null default false, created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
  action text not null, details jsonb not null, created_at timestamptz not null default now()
);

create function public.is_campus() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from auth.users where id = auth.uid() and lower(email) ~ '^[^@]+@illinois\.edu$' and email_confirmed_at is not null);
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_campus() and exists(select 1 from public.platform_admins a join auth.users u on lower(u.email) = a.email where u.id = auth.uid());
$$;
create function public.is_organizer() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.is_campus() and exists(select 1 from public.organizer_emails a join auth.users u on lower(u.email) = a.email where u.id = auth.uid()));
$$;
create function public.is_member(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_campus() and exists(select 1 from public.group_members where group_id = g and user_id = auth.uid() and status = 'active');
$$;
create function public.owns_group(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_organizer() and exists(select 1 from public.groups where id = g and owner_id = auth.uid());
$$;
create function public.sync_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email,'')) !~ '^[^@]+@illinois\.edu$' then
    raise exception 'An @illinois.edu email is required.';
  end if;
  insert into public.profiles(id, display_name) values(new.id,
    case when length(trim(coalesce(new.raw_user_meta_data->>'full_name',''))) >= 2
    then left(trim(new.raw_user_meta_data->>'full_name'),40) else 'New Illini' end) on conflict (id) do nothing;
  return new;
end; $$;
create trigger campus_profile after insert or update of email on auth.users for each row execute function public.sync_profile();

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizer_emails enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.groups enable row level security;
alter table public.group_categories enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.missions enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.nut_transactions enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

create policy public_profiles on public.profiles for select using (true);
create policy own_profile on public.profiles for update to authenticated using (id = auth.uid() and public.is_campus()) with check (id = auth.uid() and public.is_campus());
create policy public_groups on public.groups for select using (true);
create policy public_categories on public.categories for select using (true);
create policy public_group_categories on public.group_categories for select using (true);
create policy campus_settings on public.settings for select to authenticated using (public.is_campus());
create policy own_membership on public.group_members for select to authenticated using (public.is_campus() and (user_id = auth.uid() or public.owns_group(group_id) or public.is_admin()));
create policy published_missions on public.missions for select using (published or public.is_admin());
create policy group_assignments on public.assignments for select to authenticated using (public.is_member(group_id) or public.is_admin());
create policy own_submissions on public.submissions for select to authenticated using (public.is_campus() and (user_id = auth.uid() or public.is_admin()));
create policy public_points on public.nut_transactions for select using (true);
create policy admin_reports on public.reports for select to authenticated using (public.is_admin());
create policy admin_audit on public.audit_log for select to authenticated using (public.is_admin());

-- Explicit grants: RLS alone is not the permission model for state changes.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.groups, public.categories, public.group_categories, public.missions, public.nut_transactions to anon, authenticated;
grant select on public.settings, public.group_members, public.assignments, public.submissions, public.reports, public.audit_log to authenticated;
grant update (display_name, bio) on public.profiles to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

create view public.group_leaderboard with (security_invoker = true) as
  select g.id, g.name, coalesce(sum(n.amount),0)::bigint as nuts, count(n.id)::integer as completed
  from public.groups g left join public.nut_transactions n on n.group_id = g.id group by g.id;
create view public.player_leaderboard with (security_invoker = true) as
  select p.id, p.display_name, coalesce(sum(n.amount),0)::bigint as nuts, count(n.id)::integer as completed
  from public.profiles p left join public.nut_transactions n on n.user_id = p.id group by p.id;
grant select on public.group_leaderboard, public.player_leaderboard to anon, authenticated, service_role;

create function public.create_group(p_name text, p_description text, p_join_mode text, p_organization text, p_categories uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if not public.is_organizer() then raise exception 'Organizer approval is required to create a group.'; end if;
  if coalesce(array_length(p_categories,1),0) not between 1 and 10 then raise exception 'Choose at least one category.'; end if;
  if (select count(*) from public.groups where owner_id = auth.uid()) >= 10 then raise exception 'Beta limit: ten groups per organizer.'; end if;
  if p_join_mode = 'organization' and length(trim(p_organization)) < 3 then raise exception 'Enter your organization name.'; end if;
  insert into public.groups(name, description, owner_id, join_mode, organization)
    values(trim(p_name),trim(p_description),auth.uid(),p_join_mode,trim(p_organization)) returning id into g;
  insert into public.group_members values(g,auth.uid(),'active',now());
  insert into public.group_categories select g, unnest(p_categories);
  return g;
end; $$;

create function public.join_group(p_group uuid, p_code text default null) returns text
language plpgsql security definer set search_path = public as $$
declare g public.groups; s text;
begin
  if not public.is_campus() then raise exception 'Verify your @illinois.edu email first.'; end if;
  select * into g from public.groups where id = p_group for update;
  if not found then raise exception 'Group not found.'; end if;
  if exists(select 1 from public.group_members where group_id=p_group and user_id=auth.uid() and status='active') then return 'active'; end if;
  if (select count(*) from public.group_members where user_id=auth.uid()) >= 20 then raise exception 'Beta limit: twenty groups per person.'; end if;
  if g.join_mode = 'invite' and not exists(select 1 from public.group_invites where group_id=p_group and code=upper(trim(p_code)) and expires_at>now()) then raise exception 'A valid invitation code is required.'; end if;
  if g.join_mode = 'organization' then s := 'pending'; else s := 'active'; end if;
  insert into public.group_members values(p_group,auth.uid(),s,now()) on conflict (group_id,user_id) do nothing;
  return s;
end; $$;
create function public.join_by_code(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  select group_id into g from public.group_invites where code=upper(trim(p_code)) and expires_at>now();
  if g is null then raise exception 'That invitation is invalid or expired.'; end if;
  perform public.join_group(g,p_code); return g;
end; $$;
create function public.create_invite(p_group uuid) returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.owns_group(p_group) then raise exception 'Only the approved group organizer can create invites.'; end if;
  c := upper(replace(gen_random_uuid()::text,'-',''));
  insert into public.group_invites values(c,p_group,now()+interval '7 days',now()); return c;
end; $$;
create function public.review_member(p_group uuid,p_user uuid,p_approve boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_group(p_group) then raise exception 'Only the approved group organizer can review members.'; end if;
  if p_approve then
    if exists(select 1 from public.groups where id=p_group and join_mode='organization' and not organization_verified) then raise exception 'Chambana must verify this organization first.'; end if;
    update public.group_members set status='active' where group_id=p_group and user_id=p_user and status='pending';
  else delete from public.group_members where group_id=p_group and user_id=p_user and status='pending'; end if;
end; $$;

create function public.refresh_missions(p_group uuid) returns void language plpgsql security definer set search_path = public as $$
declare cfg public.settings; last_assignment public.assignments; m public.missions; i integer;
begin
  if not public.is_member(p_group) then raise exception 'Join this group first.'; end if;
  -- A single lock serializes fill/decline/submission/completion for a group.
  perform 1 from public.groups where id=p_group for update;
  select * into cfg from public.settings;
  update public.submissions set status='needs_review', reason='Photo upload did not finish. An admin can reject this attempt to allow retry.', updated_at=now()
    where assignment_id in (select id from public.assignments where group_id=p_group) and status='uploading' and created_at<now()-interval '10 minutes';
  update public.assignments a set status='expired', available_at=expires_at+make_interval(secs=>cooldown_seconds)
    where group_id=p_group and status='active' and expires_at<=now()
    and not exists(select 1 from public.submissions s where s.assignment_id=a.id and s.status in ('uploading','pending','processing','needs_review'));
  for i in 1..cfg.mission_slots loop
    select * into last_assignment from public.assignments where group_id=p_group and slot=i order by assigned_at desc limit 1;
    if found and (last_assignment.status='active' or last_assignment.available_at>now()) then continue; end if;
    select * into m from public.missions
      where published and category_id in (select category_id from public.group_categories where group_id=p_group)
      and id not in (select mission_id from public.assignments where group_id=p_group)
      order by random() limit 1;
    if not found then continue; end if;
    insert into public.assignments(group_id,mission_id,slot,title,instructions,proof_criteria,nuts,expires_at,available_at,cooldown_seconds)
      values(p_group,m.id,i,m.title,m.instructions,m.proof_criteria,m.nuts,now()+make_interval(secs=>cfg.mission_seconds),now()+make_interval(secs=>cfg.mission_seconds),cfg.cooldown_seconds);
  end loop;
end; $$;
create function public.decline_mission(p_assignment uuid) returns void language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id=p_assignment;
  if not found or not public.owns_group(a.group_id) then raise exception 'Only the group organizer can decline a shared mission.'; end if;
  perform 1 from public.groups where id=a.group_id for update;
  select * into a from public.assignments where id=p_assignment for update;
  if a.status != 'active' then raise exception 'This mission is no longer active.'; end if;
  if exists(select 1 from public.submissions where assignment_id=a.id and status in ('uploading','pending','processing','needs_review')) then raise exception 'A photo is already under review.'; end if;
  update public.assignments set status='declined', available_at=greatest(expires_at,now()+make_interval(secs=>cooldown_seconds)) where id=a.id;
end; $$;

create function public.begin_submission(p_assignment uuid,p_submission uuid) returns text language plpgsql security definer set search_path = public as $$
declare a public.assignments; path text;
begin
  select * into a from public.assignments where id=p_assignment;
  if not found or not public.is_member(a.group_id) then raise exception 'Join this group before submitting proof.'; end if;
  perform 1 from public.groups where id=a.group_id for update;
  select * into a from public.assignments where id=p_assignment for update;
  if a.status!='active' or a.expires_at<=now() then raise exception 'This mission has ended.'; end if;
  if (select count(*) from public.submissions where user_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Upload limit reached. Try again in an hour.'; end if;
  if exists(select 1 from public.submissions where assignment_id=a.id and status in ('uploading','pending','processing','needs_review')) then raise exception 'A teammate has already submitted a photo for this mission.'; end if;
  path := auth.uid()::text || '/' || p_submission::text || '.jpg';
  insert into public.submissions(id,assignment_id,user_id,storage_path) values(p_submission,a.id,auth.uid(),path);
  return path;
end; $$;
-- Server-only upload transitions: the client cannot claim a nonexistent photo.
create function public.finish_upload(p_submission uuid,p_hash text) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.submissions set status='pending', photo_hash=p_hash, updated_at=now() where id=p_submission and status='uploading';
end; $$;
create function public.fail_upload(p_submission uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.submissions set status='rejected', reason='The photo could not be saved. Please try a new photo.', updated_at=now() where id=p_submission and status='uploading';
end; $$;
create function public.claim_submission(p_submission uuid) returns setof public.submissions language plpgsql security definer set search_path = public as $$
begin
  return query update public.submissions set status='processing', attempts=attempts+1, lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
    where id=p_submission and attempts<3 and (status='pending' or (status='processing' and lease_until<now())) returning *;
end; $$;
create function public.settle_submission(p_submission uuid,p_decision text,p_reason text,p_result jsonb default null,p_lease uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare s public.submissions; a public.assignments;
begin
  if p_decision not in ('approved','rejected','needs_review') then raise exception 'Invalid verdict.'; end if;
  select * into s from public.submissions where id=p_submission;
  select * into a from public.assignments where id=s.assignment_id;
  perform 1 from public.groups where id=a.group_id for update;
  select * into a from public.assignments where id=a.id for update;
  select * into s from public.submissions where id=p_submission for update;
  if s.id is null then raise exception 'Submission not found.'; end if;
  if p_lease is not null and (s.status!='processing' or s.lease_token is distinct from p_lease) then return s.status; end if;
  if s.status in ('approved','rejected','superseded') then return s.status; end if;
  if a.status!='active' then
    update public.submissions set status='superseded',updated_at=now() where id=s.id; return 'superseded';
  end if;
  -- Submissions made before expiry can finish verification after the deadline.
  if p_decision='approved' and (s.status='uploading' or s.photo_hash is null) then raise exception 'A finished photo upload is required.'; end if;
  update public.submissions set status=p_decision,reason=left(p_reason,600),ai_result=coalesce(p_result,ai_result),lease_until=null,lease_token=null,updated_at=now() where id=s.id;
  if p_decision='approved' then
    update public.assignments set status='completed',completed_by=s.user_id,available_at=now()+make_interval(secs=>cooldown_seconds) where id=a.id;
    insert into public.nut_transactions(assignment_id,group_id,user_id,amount) values(a.id,a.group_id,s.user_id,a.nuts) on conflict(assignment_id) do nothing;
  end if;
  return p_decision;
end; $$;

create function public.admin_users(p_search text default '') returns table(id uuid,email text,display_name text,organizer boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  return query select p.id,u.email::text,p.display_name,exists(select 1 from public.organizer_emails o where o.email=lower(u.email))
    from public.profiles p join auth.users u on p.id=u.id where u.email ilike '%'||left(p_search,100)||'%' order by u.created_at desc limit 50;
end; $$;
create function public.approve_organizer(p_email text,p_approve boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  if p_approve then insert into public.organizer_emails(email,approved_by) values(lower(trim(p_email)),auth.uid()) on conflict(email) do nothing;
  else delete from public.organizer_emails where email=lower(trim(p_email)); end if;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'organizer_access',jsonb_build_object('email',p_email,'approved',p_approve));
end; $$;
create function public.verify_organization(p_group uuid,p_verified boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  update public.groups set organization_verified=p_verified where id=p_group and join_mode='organization';
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'organization_verification',jsonb_build_object('group',p_group,'verified',p_verified));
end; $$;
create function public.update_settings(p_slots integer,p_seconds integer,p_cooldown integer) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  update public.settings set mission_slots=p_slots,mission_seconds=p_seconds,cooldown_seconds=p_cooldown;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'settings',jsonb_build_object('slots',p_slots,'seconds',p_seconds,'cooldown',p_cooldown));
end; $$;
create function public.save_mission(p_id uuid,p_category uuid,p_title text,p_instructions text,p_proof text,p_nuts integer,p_published boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  m := coalesce(p_id,gen_random_uuid());
  insert into public.missions(id,category_id,title,instructions,proof_criteria,nuts,published)
    values(m,p_category,trim(p_title),trim(p_instructions),trim(p_proof),p_nuts,p_published)
    on conflict(id) do update set category_id=excluded.category_id,title=excluded.title,instructions=excluded.instructions,proof_criteria=excluded.proof_criteria,nuts=excluded.nuts,published=excluded.published;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'save_mission',jsonb_build_object('mission',m,'published',p_published)); return m;
end; $$;
create function public.review_submission(p_submission uuid,p_approve boolean,p_reason text) returns text language plpgsql security definer set search_path = public as $$
declare result text;
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  if length(trim(p_reason))<3 then raise exception 'A review reason is required.'; end if;
  result := public.settle_submission(p_submission,case when p_approve then 'approved' else 'rejected' end,p_reason);
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'submission_review',jsonb_build_object('submission',p_submission,'decision',result,'reason',p_reason)); return result;
end; $$;
create function public.report_content(p_type text,p_target uuid,p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_campus() then raise exception 'Sign in to report content.'; end if;
  if (select count(*) from public.reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'Report limit reached. Please try again later.'; end if;
  insert into public.reports(reporter_id,target_type,target_id,reason) values(auth.uid(),p_type,p_target,trim(p_reason));
end; $$;
create function public.resolve_report(p_report uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  update public.reports set resolved=true where id=p_report;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'resolve_report',jsonb_build_object('report',p_report));
end; $$;

-- Functions default to PUBLIC execute in Postgres: revoke explicitly.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(), public.is_campus(), public.is_member(uuid), public.is_organizer(), public.owns_group(uuid) to anon,authenticated;
grant execute on function public.create_group(text,text,text,text,uuid[]),public.join_group(uuid,text),public.join_by_code(text),public.create_invite(uuid),public.review_member(uuid,uuid,boolean),public.refresh_missions(uuid),public.decline_mission(uuid),public.begin_submission(uuid,uuid),public.admin_users(text),public.approve_organizer(text,boolean),public.verify_organization(uuid,boolean),public.update_settings(integer,integer,integer),public.save_mission(uuid,uuid,text,text,text,integer,boolean),public.review_submission(uuid,boolean,text),public.report_content(text,uuid,text),public.resolve_report(uuid) to authenticated;
grant execute on all functions in schema public to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('mission-proof','mission-proof',false,8388608,array['image/jpeg']) on conflict(id) do nothing;
-- No client storage writes or public reads. The application validates, strips
-- metadata and uploads photos server-side; signed viewing URLs are admin-only.

insert into public.categories(id,name) values
 ('10000000-0000-4000-8000-000000000001','Campus discoveries'),
 ('10000000-0000-4000-8000-000000000002','Squirrel spotting'),
 ('10000000-0000-4000-8000-000000000003','Around town');
