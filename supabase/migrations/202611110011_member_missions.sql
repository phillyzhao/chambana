-- Real member participation for the current mission library. Retired beta
-- missions, assignments, submissions and nut balances remain untouched.
create table public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 40),
  handle text not null unique check (handle ~ '^[a-z][a-z0-9._]{2,19}$'),
  interests text[] not null default '{}' check (cardinality(interests) <= 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id) on delete cascade,
  mission_id uuid not null references public.mission_library(id),
  status text not null default 'uploading' check (status in ('uploading','pending','approved','rejected')),
  mission_title text not null,
  mission_instructions text not null,
  proof_prompt text not null,
  nuts integer not null check (nuts between 0 and 1000),
  mission_revision integer not null check (mission_revision > 0),
  proof_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text check (length(rejection_reason) between 1 and 1000),
  check (mime_type not like 'image/%' or size_bytes <= 10485760),
  check (proof_path = user_id::text || '/' || id::text || '/proof'),
  check ((status in ('uploading','pending') and reviewed_at is null and rejection_reason is null)
    or (status = 'approved' and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_at is not null and rejection_reason is not null)),
  check (status not in ('pending','approved') or submitted_at is not null)
);
create unique index member_one_active_mission_submission
  on public.mission_submissions(user_id,mission_id)
  where status in ('uploading','pending','approved');
create index member_submission_history on public.mission_submissions(user_id,created_at desc);
create index mission_review_queue on public.mission_submissions(submitted_at) where status = 'pending';

create table public.member_nut_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(id) on delete cascade,
  mission_id uuid not null references public.mission_library(id),
  submission_id uuid not null unique references public.mission_submissions(id),
  amount integer not null check (amount between 0 and 1000),
  created_at timestamptz not null default now(),
  unique(user_id,mission_id)
);

alter table public.member_profiles enable row level security;
alter table public.mission_submissions enable row level security;
alter table public.member_nut_ledger enable row level security;
revoke all on public.member_profiles,public.mission_submissions,public.member_nut_ledger from public,anon,authenticated;
grant select on public.member_profiles,public.mission_submissions,public.member_nut_ledger to authenticated;
grant all on public.member_profiles,public.mission_submissions,public.member_nut_ledger to service_role;
create policy own_member_profile on public.member_profiles for select to authenticated using (id = auth.uid());
create policy own_mission_submissions on public.mission_submissions for select to authenticated using (user_id = auth.uid());
create policy own_member_nuts on public.member_nut_ledger for select to authenticated using (user_id = auth.uid());

-- Only this private bucket is used. Members receive an insert-only signed
-- upload token for a server-selected path; no public or authenticated policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('member-mission-proof','member-mission-proof',false,52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']);

create function public.reserve_member_submission(p_user_id uuid,p_mission_id uuid,p_mime_type text,p_size_bytes bigint)
returns public.mission_submissions
language plpgsql security definer set search_path = public,pg_temp as $$
declare m public.mission_library; s public.mission_submissions; new_id uuid := gen_random_uuid();
begin
  -- Serialize reservations for this member/mission, including rejected retries.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_mission_id::text,0));
  if not exists(select 1 from public.member_profiles where id=p_user_id) then
    raise exception 'Complete your profile before submitting proof';
  end if;
  select * into m from public.mission_library where id=p_mission_id
    and approved_at is not null and archived_at is null
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) for share;
  if not found then raise exception 'This mission is not available for submissions'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm')
    or p_size_bytes <= 0 or p_size_bytes > 52428800
    or (p_mime_type like 'image/%' and p_size_bytes > 10485760) then
    raise exception 'Choose a supported photo up to 10 MB or video up to 50 MB';
  end if;
  select * into s from public.mission_submissions where user_id=p_user_id and mission_id=p_mission_id
    and status in ('uploading','pending','approved') for update;
  if found then
    if s.status = 'uploading' and s.created_at > now()-interval '2 hours' then
      if s.mime_type = p_mime_type and s.size_bytes = p_size_bytes then return s; end if;
      raise exception 'Finish or cancel your current upload before choosing another file';
    elsif s.status = 'uploading' then
      update public.mission_submissions set status='rejected',reviewed_at=now(),rejection_reason='Upload expired. Please submit your proof again.' where id=s.id;
    else
      raise exception 'This mission already has a pending or approved submission';
    end if;
  end if;
  -- Keep abandoned uploads bounded even when requests arrive concurrently.
  perform pg_advisory_xact_lock(hashtextextended('member-upload:' || p_user_id::text,0));
  if (select count(*) from public.mission_submissions where user_id=p_user_id and created_at > now()-interval '1 hour') >= 20 then
    raise exception 'Too many uploads. Please try again later';
  end if;
  insert into public.mission_submissions(id,user_id,mission_id,mission_title,mission_instructions,proof_prompt,nuts,mission_revision,proof_path,mime_type,size_bytes)
  values(new_id,p_user_id,m.id,m.title,m.instructions,m.proof_prompt,m.nuts,m.revision,p_user_id::text || '/' || new_id::text || '/proof',p_mime_type,p_size_bytes)
  returning * into s;
  return s;
end;
$$;

create function public.finalize_member_submission(p_user_id uuid,p_submission_id uuid)
returns public.mission_submissions
language plpgsql security definer set search_path = public,pg_temp as $$
declare s public.mission_submissions; o storage.objects;
begin
  select * into s from public.mission_submissions where id=p_submission_id and user_id=p_user_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if s.status in ('pending','approved') then return s; end if;
  if s.status <> 'uploading' then raise exception 'This submission cannot be changed'; end if;
  if s.created_at <= now()-interval '2 hours' then raise exception 'Upload expired. Please submit your proof again'; end if;
  select * into o from storage.objects where bucket_id='member-mission-proof' and name=s.proof_path;
  if not found or (o.metadata->>'size')::bigint is distinct from s.size_bytes
    or o.metadata->>'mimetype' is distinct from s.mime_type then
    raise exception 'Your proof upload is incomplete. Please try again';
  end if;
  update public.mission_submissions set status='pending',submitted_at=now() where id=s.id returning * into s;
  return s;
end;
$$;

create function public.cancel_member_upload(p_user_id uuid,p_submission_id uuid)
returns void language plpgsql security definer set search_path = public,pg_temp as $$
declare s public.mission_submissions;
begin
  -- Status fencing prevents a stale cancel from deleting submitted proof.
  select * into s from public.mission_submissions where id=p_submission_id and user_id=p_user_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if s.status='rejected' and s.rejection_reason='Upload canceled. You can submit new proof.' then return; end if;
  if s.status <> 'uploading' then raise exception 'Only an unfinished upload can be canceled'; end if;
  update public.mission_submissions set status='rejected',reviewed_at=now(),rejection_reason='Upload canceled. You can submit new proof.'
  where id=p_submission_id and user_id=p_user_id and status='uploading';
end;
$$;

create function public.review_member_submission(p_submission_id uuid,p_decision text,p_reason text default '')
returns public.mission_submissions
language plpgsql security definer set search_path = public,pg_temp as $$
declare s public.mission_submissions; target_status text;
begin
  if p_decision not in ('approve','reject') then raise exception 'Choose approve or reject'; end if;
  if p_decision='reject' and (length(btrim(p_reason)) < 1 or length(btrim(p_reason)) > 1000) then
    raise exception 'Add a rejection reason of 1 to 1000 characters';
  end if;
  target_status := case p_decision when 'approve' then 'approved' else 'rejected' end;
  select * into s from public.mission_submissions where id=p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if s.status=target_status then return s; end if;
  if s.status <> 'pending' then raise exception 'This submission has already changed. Refresh the queue'; end if;
  if p_decision='approve' then
    insert into public.member_nut_ledger(user_id,mission_id,submission_id,amount)
    values(s.user_id,s.mission_id,s.id,s.nuts);
  end if;
  update public.mission_submissions set status=target_status,reviewed_at=now(),
    rejection_reason=case p_decision when 'reject' then btrim(p_reason) else null end
    where id=s.id returning * into s;
  return s;
end;
$$;

revoke all on function public.reserve_member_submission(uuid,uuid,text,bigint),
  public.finalize_member_submission(uuid,uuid),public.cancel_member_upload(uuid,uuid),
  public.review_member_submission(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_member_submission(uuid,uuid,text,bigint),
  public.finalize_member_submission(uuid,uuid),public.cancel_member_upload(uuid,uuid),
  public.review_member_submission(uuid,text,text) to service_role;
