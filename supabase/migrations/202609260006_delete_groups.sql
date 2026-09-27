-- Central catalog for accepted uploads. The image bytes remain in the private
-- mission-proof bucket; these records survive deletion of the original group.
create table public.photo_archive (
  submission_id uuid primary key,
  storage_path text not null unique,
  user_id uuid not null,
  group_id uuid not null,
  group_name text not null,
  assignment_id uuid not null,
  mission_id uuid not null,
  mission_title text not null,
  proof_criteria text not null,
  photo_hash text not null,
  review_status text not null,
  review_reason text,
  ai_result jsonb,
  submitted_at timestamptz not null,
  updated_at timestamptz not null,
  proof_deleted_at timestamptz
);
create index on public.photo_archive(submitted_at desc);
create index on public.photo_archive(group_id);
create index on public.photo_archive(user_id);
alter table public.photo_archive enable row level security;
revoke all on public.photo_archive from public,anon,authenticated;
grant select on public.photo_archive to authenticated;
grant all on public.photo_archive to service_role;
create policy admin_photo_archive on public.photo_archive for select to authenticated
  using (public.is_admin());

create function public.archive_submission_photo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.photo_hash is null then return new; end if;
  insert into public.photo_archive (
    submission_id,storage_path,user_id,group_id,group_name,assignment_id,
    mission_id,mission_title,proof_criteria,photo_hash,review_status,
    review_reason,ai_result,submitted_at,updated_at,proof_deleted_at
  ) select new.id,new.storage_path,new.user_id,g.id,g.name,a.id,
      a.mission_id,a.title,a.proof_criteria,new.photo_hash,new.status,
      new.reason,new.ai_result,new.created_at,new.updated_at,new.proof_deleted_at
    from public.assignments a join public.groups g on g.id=a.group_id
    where a.id=new.assignment_id
  on conflict(submission_id) do update set
    review_status=excluded.review_status,review_reason=excluded.review_reason,
    ai_result=excluded.ai_result,updated_at=excluded.updated_at,
    proof_deleted_at=excluded.proof_deleted_at;
  return new;
end; $$;
revoke all on function public.archive_submission_photo() from public,anon,authenticated,service_role;
create trigger archive_submission_photo after insert or update on public.submissions
  for each row execute function public.archive_submission_photo();

-- Include previously uploaded photos without re-uploading or duplicating bytes.
insert into public.photo_archive (
  submission_id,storage_path,user_id,group_id,group_name,assignment_id,
  mission_id,mission_title,proof_criteria,photo_hash,review_status,
  review_reason,ai_result,submitted_at,updated_at,proof_deleted_at
) select s.id,s.storage_path,s.user_id,g.id,g.name,a.id,
    a.mission_id,a.title,a.proof_criteria,s.photo_hash,s.status,
    s.reason,s.ai_result,s.created_at,s.updated_at,s.proof_deleted_at
  from public.submissions s join public.assignments a on a.id=s.assignment_id
  join public.groups g on g.id=a.group_id where s.photo_hash is not null;

create function public.delete_group(p_group uuid, p_confirmation text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if not public.is_organizer() then raise exception 'Only the approved group owner can delete this group.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into g from public.groups where id=p_group for update;
  if not found then raise exception 'Group not found.'; end if;
  if g.owner_id <> auth.uid() then raise exception 'Only the approved group owner can delete this group.'; end if;
  if p_confirmation is distinct from g.name then
    raise exception 'Enter the exact group name to confirm deletion.';
  end if;

  -- Match mission settlement's group -> assignment -> submission lock order.
  perform 1 from public.assignments where group_id=p_group order by id for update;
  perform 1 from public.submissions where assignment_id in
    (select id from public.assignments where group_id=p_group) order by id for update;
  if exists (select 1 from public.submissions where assignment_id in
    (select id from public.assignments where group_id=p_group) and status in ('uploading','processing')) then
    raise exception 'A photo is still uploading or being reviewed. Please try deleting the group again in a few minutes.';
  end if;

  -- photo_archive has no cascading foreign keys. Keep the photos and their
  -- metadata even when the group's operational records are removed.
  delete from public.nut_transactions where group_id=p_group;
  delete from public.submissions where assignment_id in
    (select id from public.assignments where group_id=p_group);
  delete from public.assignments where group_id=p_group;
  -- Memberships, invitations and category filters cascade from the group.
  delete from public.groups where id=p_group;
  -- Reports and the audit trail remain available for platform review.
  insert into public.audit_log(actor_id,action,details)
    values(auth.uid(),'delete_group',jsonb_build_object('group',p_group));
end; $$;
revoke all on function public.delete_group(uuid,text) from public,anon;
grant execute on function public.delete_group(uuid,text) to authenticated;
