-- A separate editorial catalog. This does not restore retired beta actions or
-- copy anything into legacy missions/assignments. New missions are private drafts.
create table public.mission_library (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 4 and 120),
  category text not null check (category in ('Self Improvement','Campus Exploration','Dares','Kindness','Food & Local')),
  instructions text not null check (length(btrim(instructions)) between 12 and 4000),
  location_name text not null check (length(btrim(location_name)) between 3 and 160),
  location_address text not null default '' check (length(location_address) <= 240),
  city text not null check (city in ('Urbana','Champaign')),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  cost_label text not null check (length(btrim(cost_label)) between 1 and 100),
  min_people integer not null default 1 check (min_people between 1 and 100),
  max_people integer not null default 4 check (max_people between min_people and 100),
  nuts integer not null default 25 check (nuts between 0 and 1000),
  proof_prompt text not null check (length(btrim(proof_prompt)) between 5 and 500),
  source_url text not null check (length(source_url) <= 2000 and source_url ~ '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
  source_checked_on date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  approved_at timestamptz,
  archived_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (archived_at is null or approved_at is null)
);

create function public.guard_mission_library_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.id <> old.id then raise exception 'Mission identity cannot change'; end if;
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  new.revision := old.revision + 1;
  -- Changing content OR a schedule withdraws the previous approval, including
  -- changes made directly through the database dashboard.
  if row(new.title,new.category,new.instructions,new.location_name,new.location_address,new.city,
    new.duration_minutes,new.cost_label,new.min_people,new.max_people,new.nuts,new.proof_prompt,
    new.source_url,new.source_checked_on,new.starts_at,new.ends_at)
    is distinct from
    row(old.title,old.category,old.instructions,old.location_name,old.location_address,old.city,
    old.duration_minutes,old.cost_label,old.min_people,old.max_people,old.nuts,old.proof_prompt,
    old.source_url,old.source_checked_on,old.starts_at,old.ends_at)
    or new.archived_at is not null then
    new.approved_at := null;
  end if;
  return new;
end;
$$;
create trigger guard_mission_library_update before update on public.mission_library
for each row execute function public.guard_mission_library_update();
revoke all on function public.guard_mission_library_update() from public,anon,authenticated;

alter table public.mission_library enable row level security;
revoke all on public.mission_library from public,anon,authenticated;
grant select on public.mission_library to anon,authenticated;
grant all on public.mission_library to service_role;
create policy approved_available_missions on public.mission_library
for select to anon,authenticated using (
  approved_at is not null and archived_at is null
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);
create index mission_library_availability on public.mission_library(starts_at,ends_at)
where approved_at is not null and archived_at is null;
