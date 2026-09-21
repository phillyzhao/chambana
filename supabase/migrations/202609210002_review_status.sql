-- Group members can see review progress without seeing a teammate's private photo
-- or AI explanation. Only the submitter receives the detailed reason.
create function public.group_submission_status(p_group uuid)
returns table(id uuid,assignment_id uuid,status text,reason text,created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_group) then raise exception 'Join this group first.'; end if;
  return query select distinct on (s.assignment_id) s.id,s.assignment_id,s.status,
    case when s.user_id=auth.uid() then s.reason else null end,s.created_at
    from public.submissions s join public.assignments a on a.id=s.assignment_id
    where a.group_id=p_group order by s.assignment_id,s.created_at desc;
end; $$;
revoke execute on function public.group_submission_status(uuid) from public,anon;
grant execute on function public.group_submission_status(uuid) to authenticated,service_role;
revoke create on schema public from public,anon,authenticated;
