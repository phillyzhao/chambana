-- Editorial placement is independent of the five mission categories. Keep the
-- owner's existing catalog, schedules, rewards, and approvals intact.
alter table public.mission_library
  add column placement text not null default 'missions'
  check (placement in ('missions', 'play'));

-- Owner-approved initial Play selection. Stable identities survive renaming.
-- Run this before extending the approval guard so moving these three does not
-- withdraw the owner's existing approvals during the release.
update public.mission_library set placement = 'play'
where id in (
  '6b10ca00-2026-4028-8025-000000000012', -- Moonwalk past Alma
  '6b10ca00-2026-4028-8025-000000000013', -- Everybody jump
  '6b10ca00-2026-4028-8025-000000000015'  -- Backwards high-five
);

create or replace function public.guard_mission_library_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.id <> old.id then raise exception 'Mission identity cannot change'; end if;
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  new.revision := old.revision + 1;
  -- Future placement edits require the same separate approval as content edits.
  if row(new.title,new.category,new.placement,new.instructions,new.location_name,new.location_address,new.city,
    new.duration_minutes,new.cost_label,new.min_people,new.max_people,new.nuts,new.proof_prompt,
    new.source_url,new.source_checked_on,new.starts_at,new.ends_at)
    is distinct from
    row(old.title,old.category,old.placement,old.instructions,old.location_name,old.location_address,old.city,
    old.duration_minutes,old.cost_label,old.min_people,old.max_people,old.nuts,old.proof_prompt,
    old.source_url,old.source_checked_on,old.starts_at,old.ends_at)
    or new.archived_at is not null then
    new.approved_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_mission_library_update() from public,anon,authenticated;
