-- Empty category selections mean the full published catalog. Existing group
-- filters, assignments and scores are preserved. The public create_group
-- wrapper retains its account lock and organizer check.
create or replace function public.create_group_internal(p_name text, p_description text, p_join_mode text, p_organization text, p_categories uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if not public.is_organizer() then raise exception 'Organizer approval is required to create a group.'; end if;
  if coalesce(cardinality(p_categories),0) > 10 then raise exception 'Choose no more than ten categories.'; end if;
  if (select count(*) from public.groups where owner_id = auth.uid()) >= 10 then raise exception 'Beta limit: ten groups per organizer.'; end if;
  if p_join_mode = 'organization' and length(trim(p_organization)) < 3 then raise exception 'Enter your organization name.'; end if;
  insert into public.groups(name, description, owner_id, join_mode, organization)
    values(trim(p_name),trim(p_description),auth.uid(),p_join_mode,trim(p_organization)) returning id into g;
  insert into public.group_members values(g,auth.uid(),'active',now());
  insert into public.group_categories select g, unnest(p_categories);
  return g;
end; $$;
revoke all on function public.create_group_internal(text,text,text,text,uuid[]) from public,anon,authenticated,service_role;

create or replace function public.refresh_missions(p_group uuid) returns void language plpgsql security definer set search_path = public as $$
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
      where published and (
        not exists (select 1 from public.group_categories where group_id=p_group)
        or category_id in (select category_id from public.group_categories where group_id=p_group)
      )
      and id not in (select mission_id from public.assignments where group_id=p_group)
      order by random() limit 1;
    if not found then continue; end if;
    insert into public.assignments(group_id,mission_id,slot,title,instructions,proof_criteria,nuts,expires_at,available_at,cooldown_seconds)
      values(p_group,m.id,i,m.title,m.instructions,m.proof_criteria,m.nuts,now()+make_interval(secs=>cfg.mission_seconds),now()+make_interval(secs=>cfg.mission_seconds),cfg.cooldown_seconds);
  end loop;
end; $$;
