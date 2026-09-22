-- Additive changes only. Existing assignments, evidence and scores are retained.
alter table public.missions add column manual_review boolean not null default false;
alter table public.missions add column catalog_key text unique;
alter table public.assignments add column manual_review boolean not null default false;
alter table public.submissions add column proof_deleted_at timestamptz;

create function public.snapshot_review_mode() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select manual_review into new.manual_review from public.missions where id=new.mission_id;
  return new;
end; $$;
create trigger assignment_review_mode before insert on public.assignments
  for each row execute function public.snapshot_review_mode();
revoke all on function public.snapshot_review_mode() from public,anon,authenticated;

-- Old calls keep working via the new trailing default. No overloaded RPC ambiguity.
drop function public.save_mission(uuid,uuid,text,text,text,integer,boolean);
create function public.save_mission(p_id uuid,p_category uuid,p_title text,p_instructions text,p_proof text,p_nuts integer,p_published boolean,p_manual_review boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if not public.is_admin() then raise exception 'Platform admin access required.'; end if;
  m := coalesce(p_id,gen_random_uuid());
  insert into public.missions(id,category_id,title,instructions,proof_criteria,nuts,published,manual_review)
    values(m,p_category,trim(p_title),trim(p_instructions),trim(p_proof),p_nuts,p_published,p_manual_review)
    on conflict(id) do update set category_id=excluded.category_id,title=excluded.title,instructions=excluded.instructions,
      proof_criteria=excluded.proof_criteria,nuts=excluded.nuts,published=excluded.published,manual_review=excluded.manual_review;
  insert into public.audit_log(actor_id,action,details) values(auth.uid(),'save_mission',jsonb_build_object('mission',m,'published',p_published));
  return m;
end; $$;
revoke all on function public.save_mission(uuid,uuid,text,text,text,integer,boolean,boolean) from public,anon;
grant execute on function public.save_mission(uuid,uuid,text,text,text,integer,boolean,boolean) to authenticated,service_role;

-- Even a buggy AI worker cannot auto-award a manual-review assignment.
alter function public.settle_submission(uuid,text,text,jsonb,uuid) rename to settle_submission_internal;
revoke all on function public.settle_submission_internal(uuid,text,text,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.settle_submission(p_submission uuid,p_decision text,p_reason text,p_result jsonb default null,p_lease uuid default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if p_lease is not null and exists (
    select 1 from public.submissions s join public.assignments a on a.id=s.assignment_id
    where s.id=p_submission and a.manual_review
  ) then
    p_decision := 'needs_review';
    p_reason := 'This mission requires an admin review; a photo cannot establish all of its criteria.';
  end if;
  return public.settle_submission_internal(p_submission,p_decision,p_reason,p_result,p_lease);
end; $$;
revoke all on function public.settle_submission(uuid,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.settle_submission(uuid,text,text,jsonb,uuid) to service_role;

-- Serialize existing count limits per account, including calls made directly to RPCs.
-- Use the same lock ordering (account, then group) across these entrypoints.
alter function public.begin_submission(uuid,uuid) rename to begin_submission_internal;
revoke all on function public.begin_submission_internal(uuid,uuid) from public,anon,authenticated,service_role;
create function public.begin_submission(p_assignment uuid,p_submission uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  return public.begin_submission_internal(p_assignment,p_submission);
end; $$;
revoke all on function public.begin_submission(uuid,uuid) from public,anon;
grant execute on function public.begin_submission(uuid,uuid) to authenticated,service_role;

alter function public.create_group(text,text,text,text,uuid[]) rename to create_group_internal;
revoke all on function public.create_group_internal(text,text,text,text,uuid[]) from public,anon,authenticated,service_role;
create function public.create_group(p_name text,p_description text,p_join_mode text,p_organization text,p_categories uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_organizer() then raise exception 'Organizer approval is required to create a group.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  return public.create_group_internal(p_name,p_description,p_join_mode,p_organization,p_categories);
end; $$;
revoke all on function public.create_group(text,text,text,text,uuid[]) from public,anon;
grant execute on function public.create_group(text,text,text,text,uuid[]) to authenticated,service_role;

alter function public.join_group(uuid,text) rename to join_group_internal;
revoke all on function public.join_group_internal(uuid,text) from public,anon,authenticated,service_role;
create function public.join_group(p_group uuid,p_code text default null) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  return public.join_group_internal(p_group,p_code);
end; $$;
revoke all on function public.join_group(uuid,text) from public,anon;
grant execute on function public.join_group(uuid,text) to authenticated,service_role;

alter function public.report_content(text,uuid,text) rename to report_content_internal;
revoke all on function public.report_content_internal(text,uuid,text) from public,anon,authenticated,service_role;
create function public.report_content(p_type text,p_target uuid,p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_campus() then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  perform public.report_content_internal(p_type,p_target,p_reason);
end; $$;
revoke all on function public.report_content(text,uuid,text) from public,anon;
grant execute on function public.report_content(text,uuid,text) to authenticated,service_role;

alter function public.create_invite(uuid) rename to create_invite_internal;
revoke all on function public.create_invite_internal(uuid) from public,anon,authenticated,service_role;
create function public.create_invite(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_group(p_group) then raise exception 'Only the approved group organizer can create invites.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if (select count(*) from public.group_invites where group_id=p_group and created_at>now()-interval '1 hour')>=20
    then raise exception 'Invite limit reached. Please try again later.'; end if;
  return public.create_invite_internal(p_group);
end; $$;
revoke all on function public.create_invite(uuid) from public,anon;
grant execute on function public.create_invite(uuid) to authenticated,service_role;

create table public.request_limits (
  key text primary key check(length(key)=64),
  hits integer not null,
  expires_at timestamptz not null
);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from public,anon,authenticated;
grant all on public.request_limits to service_role;
create function public.consume_request_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare count integer;
begin
  if p_limit is null or p_limit not between 1 and 1000 or p_seconds is null or p_seconds not between 1 and 3600 then
    raise exception 'Invalid rate limit.';
  end if;
  insert into public.request_limits as r(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
  on conflict(key) do update set
    hits=case when r.expires_at<=now() then 1 else least(r.hits+1,p_limit+1) end,
    expires_at=case when r.expires_at<=now() then now()+make_interval(secs=>p_seconds) else r.expires_at end
  returning hits into count;
  return count<=p_limit;
end; $$;
revoke all on function public.consume_request_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_request_limit(text,integer,integer) to service_role;

-- One transaction: validate/import first, then unpublish old catalog entries.
-- Stable keys make repeat runs idempotent; assignment snapshots are untouched.
create function public.replace_mission_catalog(p_missions jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare m jsonb; cat uuid; keys text[] := '{}'; key text; total integer := 0;
begin
  if jsonb_typeof(p_missions) is distinct from 'array' or jsonb_array_length(p_missions) not between 1 and 200 then
    raise exception 'Provide 1 to 200 missions.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('chambana:catalog',0));
  for m in select value from jsonb_array_elements(p_missions) loop
    key := m->>'key';
    if key is null or key !~ '^[a-z0-9][a-z0-9-]{2,99}$' or key=any(keys) then raise exception 'Invalid or duplicate catalog key.'; end if;
    keys := array_append(keys,key);
    select id into cat from public.categories where name=m->>'category';
    if cat is null then raise exception 'Unknown category.'; end if;
    insert into public.missions(catalog_key,category_id,title,instructions,proof_criteria,nuts,published,manual_review)
    values(key,cat,m->>'title',m->>'instructions',m->>'proof',(m->>'nuts')::integer,true,coalesce((m->>'manual_review')::boolean,false))
    on conflict(catalog_key) do update set category_id=excluded.category_id,title=excluded.title,instructions=excluded.instructions,
      proof_criteria=excluded.proof_criteria,nuts=excluded.nuts,published=true,manual_review=excluded.manual_review;
    total:=total+1;
  end loop;
  update public.missions set published=false where catalog_key is null or not(catalog_key=any(keys));
  insert into public.audit_log(action,details) values('replace_catalog',jsonb_build_object('count',total,'keys',keys));
  return total;
end; $$;
revoke all on function public.replace_mission_catalog(jsonb) from public,anon,authenticated;
grant execute on function public.replace_mission_catalog(jsonb) to service_role;
